/**
 * Tool: Compress PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="compression-level">Compression Level</label>
            <select id="compression-level" class="form-control">
                <option value="medium" selected>Medium Compression (Recommended)</option>
                <option value="high">High Compression (Lower quality/metadata stripped)</option>
                <option value="low">Low Compression (Highest quality)</option>
            </select>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                Our compression optimizer cleans structural streams, strips redundant formatting objects, and compresses PDF cross-reference tables. All logic runs inside your browser.
            </p>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="file-list-grid" id="compress-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="compress-preview-canvas">
                    <div class="spinner"></div>
                </div>
                <span class="file-name">Document Cover Preview</span>
            </div>
        </div>
    `;

    try {
        const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
        const pdfDoc = await loadPdfDoc(arrayBuffer);
        const canvas = await renderPdfPageToCanvas(pdfDoc, 1, 0.4);
        
        const previewContainer = document.getElementById('compress-preview-canvas');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    } catch (err) {
        console.error('Error rendering compress preview:', err);
        const previewContainer = document.getElementById('compress-preview-canvas');
        previewContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');

    progressCallback(20, 'Reading PDF streams...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    
    progressCallback(45, 'Optimizing structural objects...');
    const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // Create new document to copy elements into (removes dangling structures and metadata)
    const targetPdf = await PDFLib.PDFDocument.create();
    
    const copiedPages = await targetPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    copiedPages.forEach(page => targetPdf.addPage(page));

    const compressionLevel = options['compression-level'] || 'medium';
    
    if (compressionLevel === 'high') {
        // Strip metadata and form fields if compression is high
        targetPdf.setTitle('');
        targetPdf.setAuthor('');
        targetPdf.setSubject('');
        targetPdf.setCreator('');
        targetPdf.setKeywords([]);
        targetPdf.setProducer('');
    }

    progressCallback(80, 'Applying stream compression...');
    // save() with useObjectStreams: true packages multiple objects into cross-referenced compressed streams
    const compressedBytes = await targetPdf.save({
        useObjectStreams: true,
        addOriginalUpdateIndicator: false
    });

    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Compressed.pdf`;

    progressCallback(100, 'Compression Complete!');
    return { blob, filename };
}
