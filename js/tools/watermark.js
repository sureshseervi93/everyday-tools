/**
 * Tool: Add Watermark
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="wm-text">Watermark Text</label>
            <input type="text" id="wm-text" class="form-control" placeholder="e.g. CONFIDENTIAL, DRAFT" value="CONFIDENTIAL" required>
        </div>
        <div class="form-group">
            <label for="wm-size">Font Size</label>
            <input type="number" id="wm-size" class="form-control" value="50" min="10" max="150">
        </div>
        <div class="form-group">
            <label for="wm-color">Text Color</label>
            <div class="color-picker-wrapper">
                <input type="color" id="wm-color" class="form-control" value="#ff0000" style="padding:0;width:40px;height:40px;border-radius:50%;overflow:hidden;border:none;cursor:pointer;">
                <span id="color-hex-label">#ff0000</span>
            </div>
        </div>
        <div class="form-group">
            <label for="wm-opacity">Opacity</label>
            <input type="range" id="wm-opacity" class="form-control" min="0.1" max="1.0" step="0.05" value="0.3">
            <span id="wm-opacity-label">30%</span>
        </div>
        <div class="form-group">
            <label for="wm-rotation">Rotation (degrees)</label>
            <input type="number" id="wm-rotation" class="form-control" value="45" min="-360" max="360">
        </div>
        <div class="form-group">
            <label for="wm-position">Position</label>
            <select id="wm-position" class="form-control">
                <option value="center" selected>Center</option>
                <option value="top-left">Top-Left</option>
                <option value="top-right">Top-Right</option>
                <option value="bottom-left">Bottom-Left</option>
                <option value="bottom-right">Bottom-Right</option>
                <option value="grid">Repeated Grid</option>
            </select>
        </div>
    `;

    // Dynamic label bindings
    const colorInput = document.getElementById('wm-color');
    const colorLabel = document.getElementById('color-hex-label');
    colorInput.addEventListener('input', (e) => {
        colorLabel.textContent = e.target.value;
    });

    const opacityInput = document.getElementById('wm-opacity');
    const opacityLabel = document.getElementById('wm-opacity-label');
    opacityInput.addEventListener('input', (e) => {
        opacityLabel.textContent = `${Math.round(e.target.value * 100)}%`;
    });
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="file-list-grid" id="watermark-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="watermark-preview-canvas">
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
        
        const previewContainer = document.getElementById('watermark-preview-canvas');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    } catch (err) {
        console.error('Error rendering watermark preview:', err);
        const previewContainer = document.getElementById('watermark-preview-canvas');
        previewContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');

    const text = options['wm-text'] || 'CONFIDENTIAL';
    const size = parseInt(options['wm-size'] || '50');
    const colorHex = options['wm-color'] || '#ff0000';
    const opacity = parseFloat(options['wm-opacity'] || '0.3');
    const rotation = parseInt(options['wm-rotation'] || '45');
    const position = options['wm-position'] || 'center';

    progressCallback(15, 'Reading PDF document...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // Convert hex to rgb coordinates
    const r = parseInt(colorHex.substring(1, 3), 16) / 255;
    const g = parseInt(colorHex.substring(3, 5), 16) / 255;
    const b = parseInt(colorHex.substring(5, 7), 16) / 255;
    const color = PDFLib.rgb(r, g, b);

    progressCallback(45, 'Applying watermarks to pages...');
    
    // Calculate text width/height for layout calculations
    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = size; // Approximate height

    pages.forEach((page, index) => {
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const drawOptions = {
            size: size,
            font: font,
            color: color,
            opacity: opacity,
            rotate: PDFLib.degrees(rotation)
        };

        if (position === 'grid') {
            // Draw repeatedly in grid structure
            const cols = 3;
            const rows = 4;
            const hGap = pageWidth / cols;
            const vGap = pageHeight / rows;
            
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const x = hGap * c + (hGap - textWidth) / 2;
                    const y = vGap * r + (vGap - textHeight) / 2;
                    
                    page.drawText(text, {
                        ...drawOptions,
                        x: x,
                        y: y
                    });
                }
            }
        } else {
            // Individual positions
            let x = 0;
            let y = 0;

            if (position === 'center') {
                // Approximate coordinate offset for rotated text centers
                const rad = (rotation * Math.PI) / 180;
                x = (pageWidth - textWidth * Math.cos(rad)) / 2;
                y = (pageHeight - textWidth * Math.sin(rad)) / 2;
            } else if (position === 'top-left') {
                x = 30;
                y = pageHeight - textHeight - 30;
            } else if (position === 'top-right') {
                x = pageWidth - textWidth - 30;
                y = pageHeight - textHeight - 30;
            } else if (position === 'bottom-left') {
                x = 30;
                y = 30;
            } else if (position === 'bottom-right') {
                x = pageWidth - textWidth - 30;
                y = 30;
            }

            page.drawText(text, {
                ...drawOptions,
                x: x,
                y: y
            });
        }

        const pct = Math.floor(45 + (index / pages.length) * 45);
        progressCallback(pct, `Watermarking Page ${index + 1} of ${pages.length}...`);
    });

    progressCallback(90, 'Saving watermarked document...');
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Watermarked.pdf`;

    progressCallback(100, 'Watermark Complete!');
    return { blob, filename };
}
