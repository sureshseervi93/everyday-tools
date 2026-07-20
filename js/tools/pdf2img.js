/**
 * Tool: PDF to Images
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="img-format">Image Format</label>
            <select id="img-format" class="form-control">
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="img-scale">Resolution / Scale</label>
            <select id="img-scale" class="form-control">
                <option value="1">1.0x (Standard Web)</option>
                <option value="1.5">1.5x (Medium Printing)</option>
                <option value="2">2.0x (High-Res / Crisp)</option>
            </select>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="file-list-grid" id="pdf2img-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="pdf2img-preview-canvas">
                    <div class="spinner"></div>
                </div>
                <span class="file-name">First Page Preview</span>
            </div>
        </div>
    `;

    try {
        const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
        const pdfDoc = await loadPdfDoc(arrayBuffer);
        const canvas = await renderPdfPageToCanvas(pdfDoc, 1, 0.4);
        
        const previewContainer = document.getElementById('pdf2img-preview-canvas');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    } catch (err) {
        console.error('Error rendering pdf2img preview:', err);
        const previewContainer = document.getElementById('pdf2img-preview-canvas');
        previewContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');

    progressCallback(10, 'Loading PDF parser...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const pdfDoc = await loadPdfDoc(arrayBuffer);
    const numPages = pdfDoc.numPages;

    const format = options['img-format'] || 'image/jpeg';
    const scale = parseFloat(options['img-scale'] || '1.5');
    const ext = format === 'image/png' ? 'png' : 'jpg';

    progressCallback(20, `Converting 1 of ${numPages} page(s)...`);
    const zip = new JSZip();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const pct = Math.floor(20 + (pageNum / numPages) * 65);
        progressCallback(pct, `Rendering Page ${pageNum} of ${numPages}...`);

        try {
            // Load and render page at target scale
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Convert canvas to blob
            const blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), format, format === 'image/jpeg' ? 0.92 : undefined);
            });

            zip.file(`page_${pageNum}.${ext}`, blob);
        } catch (err) {
            console.error(`Failed to convert page ${pageNum}:`, err);
            throw new Error(`Failed to convert page ${pageNum}: ${err.message}`);
        }
    }

    progressCallback(88, 'Bundling images into ZIP file...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_images.zip`;

    progressCallback(100, 'Conversion Complete!');
    return { zipBlob, filename };
}
