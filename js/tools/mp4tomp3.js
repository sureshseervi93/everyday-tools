/**
 * Tool: MP4 to MP3 (Audio Extractor)
 */

import { readFileAsArrayBuffer } from '../utils.js';

let loadedVideoFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="mp3-bitrate">Output Bitrate</label>
            <select id="mp3-bitrate" class="form-control">
                <option value="128">128 kbps (Standard)</option>
                <option value="192" selected>192 kbps (High Quality)</option>
                <option value="256">256 kbps (Premium)</option>
                <option value="320">320 kbps (Max Quality / Lossy)</option>
            </select>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                Select your preferred audio quality. Higher bitrates yield crisper sound but larger file sizes.
            </p>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    loadedVideoFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>Selected Video:</strong> ${loadedVideoFile.name} (${utils.formatBytes(loadedVideoFile.size)})
        </div>
        
        <div class="processing-state" style="border-style: solid; text-align: left; padding: 20px;">
            <h3 style="font-size: 1rem; margin-bottom: 8px; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                <i data-lucide="info" style="width:18px;height:18px;"></i> Client-Side Extraction Information
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                Everyday Tools extracts audio 100% locally inside your browser. No data is sent to a server, ensuring 100% privacy and secure files.
            </p>
            <div style="font-size: 0.8rem; padding: 10px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border: 1px solid var(--warning); color: var(--text-main);">
                <strong>Performance Note:</strong> Decodes and compresses files in memory. For long video clips (e.g. movies over 10-15 minutes), please ensure your device has sufficient RAM.
            </div>
        </div>
    `;

    lucide.createIcons();
}

export async function process(files, options, progressCallback) {
    if (!loadedVideoFile) throw new Error('No video file loaded.');

    progressCallback(10, 'Reading video binary file...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedVideoFile);

    progressCallback(25, 'Decoding audio track from video stream...');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    let decodedBuffer;
    try {
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
        throw new Error('Failed to extract audio track. Ensure the video file contains an AAC, MP3, or WAV audio stream. Details: ' + err.message);
    }

    const duration = decodedBuffer.duration;
    const sampleRate = decodedBuffer.sampleRate;
    const channels = decodedBuffer.numberOfChannels;
    const length = decodedBuffer.length;
    const bitrate = parseInt(options['mp3-bitrate'] || '192');

    progressCallback(45, 'Extracting channel amplitudes...');
    
    // Copy Float32 PCM channels
    const floatChannels = [];
    for (let c = 0; c < channels; c++) {
        floatChannels.push(decodedBuffer.getChannelData(c));
    }

    progressCallback(60, 'Scaling PCM samples to 16-bit encoding...');
    
    // Convert Float32 to Int16 PCM samples
    const intChannels = [];
    for (let c = 0; c < channels; c++) {
        const floatData = floatChannels[c];
        const intData = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; i++) {
            let s = Math.max(-1, Math.min(1, floatData[i]));
            intData[i] = s < 0 ? s * 32768 : s * 32767;
        }
        intChannels.push(intData);
    }

    progressCallback(75, 'Transcoding audio to MP3 format...');
    
    // Initialize LAME MP3 Encoder
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
    const mp3Data = [];
    const blockSize = 1152;

    for (let i = 0; i < length; i += blockSize) {
        let mp3buf;
        if (channels === 2) {
            const leftBlock = intChannels[0].subarray(i, i + blockSize);
            const rightBlock = intChannels[1].subarray(i, i + blockSize);
            mp3buf = mp3encoder.encodeBuffer(leftBlock, rightBlock);
        } else {
            const monoBlock = intChannels[0].subarray(i, i + blockSize);
            mp3buf = mp3encoder.encodeBuffer(monoBlock);
        }

        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        const pct = Math.floor(75 + (i / length) * 20);
        if (pct % 5 === 0) {
            progressCallback(pct, `Compressing audio stream: ${pct}%...`);
        }
    }

    progressCallback(95, 'Finalizing file packaging...');
    const flushBuf = mp3encoder.flush();
    if (flushBuf.length > 0) {
        mp3Data.push(flushBuf);
    }

    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
    const filename = `${loadedVideoFile.name.split('.')[0]}_audio.mp3`;

    progressCallback(100, 'Audio Extraction Complete!');
    return { blob, filename };
}
