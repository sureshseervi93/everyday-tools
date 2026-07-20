/**
 * Tool: MP3 Cropper (Audio Trimmer)
 */

import { readFileAsArrayBuffer } from '../utils.js';

let audioContext = null;
let originalAudioBuffer = null;
let croppedAudioBuffer = null;
let activeSourceNode = null;
let playbackStartTime = 0;
let isPlaying = false;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="trim-start">Start Time (seconds)</label>
            <input type="number" id="trim-start" class="form-control" value="0" min="0" step="0.1">
        </div>
        <div class="form-group">
            <label for="trim-end">End Time (seconds)</label>
            <input type="number" id="trim-end" class="form-control" value="10" min="0.1" step="0.1">
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                Adjust the start and end times in seconds, then click <strong>Process Files</strong> to export your cropped audio.
            </p>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    const file = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
            <strong>Editing Audio:</strong> ${file.name}
            <span class="dropzone-hint" id="audio-duration-badge">0:00</span>
        </div>
        
        <div class="waveform-container">
            <canvas class="waveform-canvas" id="audio-waveform"></canvas>
            <div class="trim-time-displays">
                <span id="label-curr-time">Current: 0.00s</span>
                <span id="label-selected-range">Selected: 0.00s - 10.00s</span>
            </div>
        </div>

        <div class="audio-controls">
            <button class="play-btn" id="btn-play-pause" title="Play/Pause Selected Range">
                <i data-lucide="play" id="play-icon" style="width:20px;height:20px;fill:currentColor;"></i>
            </button>
        </div>
    `;

    lucide.createIcons();

    const startInput = document.getElementById('trim-start');
    const endInput = document.getElementById('trim-end');
    const durationBadge = document.getElementById('audio-duration-badge');
    const selectedRangeLabel = document.getElementById('label-selected-range');

    try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        
        // Initialize AudioContext
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Decode audio
        originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = originalAudioBuffer.duration;
        
        // Update labels and clamp inputs
        durationBadge.textContent = formatTime(duration);
        
        startInput.value = '0';
        startInput.max = duration;
        endInput.value = Math.min(10, duration).toFixed(1);
        endInput.max = duration;
        
        updateRangeLabel();
        
        // Draw Waveform
        drawWaveform(originalAudioBuffer);

        // Input change events to redraw selection markers on waveform
        startInput.addEventListener('input', () => {
            let start = parseFloat(startInput.value) || 0;
            let end = parseFloat(endInput.value) || 0;
            if (start >= end) start = Math.max(0, end - 0.1);
            startInput.value = start.toFixed(1);
            updateRangeLabel();
            drawWaveform(originalAudioBuffer);
        });

        endInput.addEventListener('input', () => {
            let start = parseFloat(startInput.value) || 0;
            let end = parseFloat(endInput.value) || 0;
            if (end <= start) end = Math.min(duration, start + 0.1);
            endInput.value = end.toFixed(1);
            updateRangeLabel();
            drawWaveform(originalAudioBuffer);
        });

        // Playback trigger
        const playBtn = document.getElementById('btn-play-pause');
        playBtn.addEventListener('click', togglePlayback);

    } catch (err) {
        console.error('Failed to load or parse audio file:', err);
        container.innerHTML = `<p style="color:var(--error);text-align:center;">Failed to load audio: ${err.message}</p>`;
    }
}

function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
}

function updateRangeLabel() {
    const start = parseFloat(document.getElementById('trim-start').value) || 0;
    const end = parseFloat(document.getElementById('trim-end').value) || 0;
    const label = document.getElementById('label-selected-range');
    if (label) {
        label.textContent = `Selected: ${start.toFixed(2)}s - ${end.toFixed(2)}s (${(end - start).toFixed(2)}s total)`;
    }
}

function drawWaveform(audioBuffer) {
    const canvas = document.getElementById('audio-waveform');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 140;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Read channel 1 data
    const pcmData = audioBuffer.getChannelData(0);
    const step = Math.ceil(pcmData.length / width);
    const amp = height / 2;

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Get selections
    const startSec = parseFloat(document.getElementById('trim-start').value) || 0;
    const endSec = parseFloat(document.getElementById('trim-end').value) || 0;
    const duration = audioBuffer.duration;

    const startPx = (startSec / duration) * width;
    const endPx = (endSec / duration) * width;

    // Draw unselected shading mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, startPx, height);
    ctx.fillRect(endPx, 0, width - endPx, height);

    // Create gradient for waveform bars
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#6366f1'); // Indigo
    gradient.addColorStop(1, '#a855f7'); // Purple

    // Render columns
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const dat = pcmData[i * step + j];
            if (dat < min) min = dat;
            if (dat > max) max = dat;
        }

        // Draw standard bar
        const isSelected = i >= startPx && i <= endPx;
        ctx.fillStyle = isSelected ? gradient : 'var(--text-muted)';
        
        const barHeight = Math.max(2, (max - min) * amp * 0.9);
        const y = (height - barHeight) / 2;
        ctx.fillRect(i, y, 1.5, barHeight);
    }

    // Draw selection borders
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx, height);
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx, height);
    ctx.stroke();
}

function togglePlayback() {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (!audioContext || !originalAudioBuffer) return;
    
    // Stop previous if exists
    stopPlayback();

    const startSec = parseFloat(document.getElementById('trim-start').value) || 0;
    const endSec = parseFloat(document.getElementById('trim-end').value) || 0;
    const playDuration = endSec - startSec;

    if (playDuration <= 0) return;

    activeSourceNode = audioContext.createBufferSource();
    activeSourceNode.buffer = originalAudioBuffer;
    activeSourceNode.connect(audioContext.destination);

    // Playback loop or range setting
    activeSourceNode.start(0, startSec, playDuration);
    isPlaying = true;
    playbackStartTime = audioContext.currentTime;

    // Toggle Icon to pause
    const playIcon = document.getElementById('play-icon');
    playIcon.setAttribute('data-lucide', 'pause');
    lucide.createIcons();

    activeSourceNode.onended = () => {
        // Only trigger stop if node ended naturally
        if (isPlaying && (audioContext.currentTime - playbackStartTime >= playDuration - 0.1)) {
            stopPlayback();
        }
    };
}

function stopPlayback() {
    if (activeSourceNode) {
        try {
            activeSourceNode.stop();
        } catch (e) {}
        activeSourceNode.disconnect();
        activeSourceNode = null;
    }
    isPlaying = false;
    
    // Toggle Icon to play
    const playIcon = document.getElementById('play-icon');
    if (playIcon) {
        playIcon.setAttribute('data-lucide', 'play');
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!originalAudioBuffer) throw new Error('No audio loaded.');
    stopPlayback();

    const startSec = parseFloat(options['trim-start']) || 0;
    const endSec = parseFloat(options['trim-end']) || 0;
    const duration = originalAudioBuffer.duration;

    if (startSec >= endSec || startSec < 0 || endSec > duration) {
        throw new Error('Invalid trim range.');
    }

    progressCallback(10, 'Extracting audio channels...');

    const sampleRate = originalAudioBuffer.sampleRate;
    const startSample = Math.floor(startSec * sampleRate);
    const endSample = Math.floor(endSec * sampleRate);
    const totalSamples = endSample - startSample;
    const channels = originalAudioBuffer.numberOfChannels;

    // Retrieve PCM channel data subarrays
    const pcmChannels = [];
    for (let c = 0; c < channels; c++) {
        const fullData = originalAudioBuffer.getChannelData(c);
        pcmChannels.push(fullData.subarray(startSample, endSample));
    }

    progressCallback(35, 'Converting PCM floating numbers to 16-bit integers...');
    
    // Convert to Int16
    const intSamples = [];
    for (let c = 0; c < channels; c++) {
        const floatData = pcmChannels[c];
        const intData = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; i++) {
            let s = Math.max(-1, Math.min(1, floatData[i]));
            intData[i] = s < 0 ? s * 32768 : s * 32767;
        }
        intSamples.push(intData);
    }

    progressCallback(60, 'Encoding to MP3 via LAME...');
    
    // Setup LAME encoder
    // lamejs has global object Mp3Encoder
    const kbps = 192;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Chunks = [];
    const blockSize = 1152;

    const length = intSamples[0].length;
    
    for (let i = 0; i < length; i += blockSize) {
        let mp3buf;
        if (channels === 2) {
            const leftChunk = intSamples[0].subarray(i, i + blockSize);
            const rightChunk = intSamples[1].subarray(i, i + blockSize);
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        } else {
            const monoChunk = intSamples[0].subarray(i, i + blockSize);
            mp3buf = mp3encoder.encodeBuffer(monoChunk);
        }

        if (mp3buf.length > 0) {
            mp3Chunks.push(mp3buf);
        }

        const pct = Math.floor(60 + (i / length) * 30);
        if (pct % 10 === 0) {
            progressCallback(pct, `Compressing MP3 blocks...`);
        }
    }

    progressCallback(92, 'Flushing encoder buffer...');
    const flushBuf = mp3encoder.flush();
    if (flushBuf.length > 0) {
        mp3Chunks.push(flushBuf);
    }

    const blob = new Blob(mp3Chunks, { type: 'audio/mp3' });
    const filename = `${files[0].name.split('.')[0]}_trimmed.mp3`;

    progressCallback(100, 'Cropping Complete!');
    return { blob, filename };
}
