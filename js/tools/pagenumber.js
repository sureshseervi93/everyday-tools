/**
 * Tool: Page Numbers
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="pn-start">Start Page Number</label>
            <input type="number" id="pn-start" class="form-control" value="1" min="0">
        </div>
        <div class="form-group">
            <label for="pn-format">Format</label>
            <select id="pn-format" class="form-control">
                <option value="Page {num}" selected>Page X</option>
                <option value="Page {num} of {count}">Page X of Y</option>
                <option value="{num}">X (Just Number)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="pn-position">Position</label>
            <select id="pn-position" class="form-control">
                <option value="bottom-center" selected>Bottom-Center (Footer)</option>
                <option value="bottom-right">Bottom-Right</option>
                <option value="bottom-left">Bottom-Left</option>
                <option value="top-center">Top-Center (Header)</option>
                <option value="top-right">Top-Right</option>
                <option value="top-left">Top-Left</option>
            </select>
        </div>
        <div class="form-group">
            <label for="pn-size">Font Size</label>
            <input type="number" id="pn-size" class="form-control" value="10" min="6" max="30">
        </div>
        <div class="form-group">
            <label for="pn-color">Text Color</label>
            <div class="color-picker-wrapper">
                <input type="color" id="pn-color" class="form-control" value="#555555" style="padding:0;width:40px;height:40px;border-radius:50%;overflow:hidden;border:none;cursor:pointer;">
                <span id="pn-color-label">#555555</span>
            </div>
        </div>
    `;

    const colorInput = document.getElementById('pn-color');
    const colorLabel = document.getElementById('pn-color-label');
    colorInput.addEventListener('input', (e) => {
        colorLabel.textContent = e.target.value;
    });
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="file-list-grid" id="pagenumber-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="pagenumber-preview-canvas">
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
        
        const previewContainer = document.getElementById('pagenumber-preview-canvas');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    } catch (err) {
        console.error('Error rendering pagenumber preview:', err);
        const previewContainer = document.getElementById('pagenumber-preview-canvas');
        previewContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');

    const startNum = parseInt(options['pn-start'] || '1');
    const format = options['pn-format'] || 'Page {num}';
    const position = options['pn-position'] || 'bottom-center';
    const fontSize = parseInt(options['pn-size'] || '10');
    const colorHex = options['pn-color'] || '#555555';

    progressCallback(15, 'Loading PDF documents...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalCount = pages.length;

    // Convert hex to rgb
    const r = parseInt(colorHex.substring(1, 3), 16) / 255;
    const g = parseInt(colorHex.substring(3, 5), 16) / 255;
    const b = parseInt(colorHex.substring(5, 7), 16) / 255;
    const textColor = PDFLib.rgb(r, g, b);

    progressCallback(50, 'Inserting page numbers...');

    pages.forEach((page, index) => {
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        // Compile page number text string
        const currentNum = startNum + index;
        let text = format.replace('{num}', currentNum).replace('{count}', totalCount);

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;

        let x = 0;
        let y = 0;

        // Position coordinates layout math
        if (position.includes('bottom')) {
            y = 20; // 20px from bottom margin
        } else {
            y = pageHeight - textHeight - 20; // 20px from top margin
        }

        if (position.includes('center')) {
            x = (pageWidth - textWidth) / 2;
        } else if (position.includes('left')) {
            x = 30; // 30px offset
        } else if (position.includes('right')) {
            x = pageWidth - textWidth - 30; // 30px from right edge
        }

        page.drawText(text, {
            x: x,
            y: y,
            size: fontSize,
            font: font,
            color: textColor
        });

        const pct = Math.floor(50 + (index / totalCount) * 40);
        progressCallback(pct, `Inserting page number on page ${currentNum} of ${totalCount}...`);
    });

    progressCallback(92, 'Finalizing output PDF...');
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Numbered.pdf`;

    progressCallback(100, 'Adding Page Numbers Complete!');
    return { blob, filename };
}
