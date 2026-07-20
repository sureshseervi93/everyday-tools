/**
 * Tool: Split PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;
let pageCount = 0;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="split-mode">Split Mode</label>
            <select id="split-mode" class="form-control">
                <option value="custom">Extract Custom Ranges</option>
                <option value="all">Extract All Pages</option>
            </select>
        </div>
        
        <div id="custom-ranges-container">
            <div class="form-group">
                <label for="page-ranges">Page Ranges</label>
                <input type="text" id="page-ranges" class="form-control" placeholder="e.g. 1-3, 5, 8-10" value="1">
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                    Define page numbers and/or ranges separated by commas.
                </p>
            </div>
        </div>
    `;

    const splitMode = document.getElementById('split-mode');
    const customRanges = document.getElementById('custom-ranges-container');

    splitMode.addEventListener('change', () => {
        if (splitMode.value === 'custom') {
            customRanges.classList.remove('hidden');
        } else {
            customRanges.classList.add('hidden');
        }
    });
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="file-list-grid" id="split-page-preview-grid"></div>
    `;

    const previewGrid = document.getElementById('split-page-preview-grid');
    
    try {
        const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
        const pdfDoc = await loadPdfDoc(arrayBuffer);
        pageCount = pdfDoc.numPages;

        // Set default range in options to cover all pages
        const rangeInput = document.getElementById('page-ranges');
        if (rangeInput) {
            rangeInput.value = `1-${pageCount}`;
        }

        // Render thumbnails for all pages
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            const card = document.createElement('div');
            card.className = 'file-thumb-card';
            card.innerHTML = `
                <div class="file-thumb-canvas-container">
                    <div class="spinner"></div>
                </div>
                <span class="file-name">Page ${pageNum}</span>
            `;
            previewGrid.appendChild(card);
            
            // Asynchronously render the page
            renderPdfPageToCanvas(pdfDoc, pageNum, 0.4).then(canvas => {
                const container = card.querySelector('.file-thumb-canvas-container');
                container.innerHTML = '';
                container.appendChild(canvas);
            }).catch(err => {
                const container = card.querySelector('.file-thumb-canvas-container');
                container.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
                lucide.createIcons();
            });
        }
    } catch (err) {
        console.error('Error loading PDF for split previews:', err);
        previewGrid.innerHTML = `<p class="text-center" style="color: var(--error)">Failed to load previews: ${err.message}</p>`;
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');
    
    progressCallback(10, 'Reading PDF file...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = srcPdf.getPageCount();

    const mode = options['split-mode'];

    if (mode === 'all') {
        // Extract each page to its own PDF and zip them
        progressCallback(30, 'Splitting all pages...');
        const zip = new JSZip();
        
        for (let i = 0; i < totalPages; i++) {
            const tempPdf = await PDFLib.PDFDocument.create();
            const [copiedPage] = await tempPdf.copyPages(srcPdf, [i]);
            tempPdf.addPage(copiedPage);
            
            const pdfBytes = await tempPdf.save();
            const pageNum = i + 1;
            zip.file(`page_${pageNum}.pdf`, pdfBytes);
            
            const pct = Math.floor(30 + (i / totalPages) * 50);
            progressCallback(pct, `Splitting page ${pageNum} of ${totalPages}...`);
        }
        
        progressCallback(85, 'Compiling ZIP archive...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const filename = `${loadedFile.name.replace('.pdf', '')}_Pages.zip`;
        
        progressCallback(100, 'Split Complete!');
        return { zipBlob, filename };
    } else {
        // Extract specific page ranges
        const rangeStr = options['page-ranges'] || '';
        const pagesToExtract = parsePageRanges(rangeStr, totalPages);
        
        if (pagesToExtract.length === 0) {
            throw new Error('Invalid page ranges. Please specify page numbers within 1 to ' + totalPages);
        }
        
        progressCallback(40, 'Extracting selected pages...');
        const targetPdf = await PDFLib.PDFDocument.create();
        
        // pdf-lib indices are 0-based, parsed numbers are 1-based
        const copiedPages = await targetPdf.copyPages(srcPdf, pagesToExtract.map(p => p - 1));
        copiedPages.forEach(page => targetPdf.addPage(page));
        
        progressCallback(80, 'Saving split PDF...');
        const pdfBytes = await targetPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = `${loadedFile.name.replace('.pdf', '')}_Split.pdf`;
        
        progressCallback(100, 'Split Complete!');
        return { blob, filename };
    }
}

/**
 * Parses ranges string like "1-3, 5, 8-10" and returns flat sorted array of 1-based page indices
 */
function parsePageRanges(rangeStr, maxPages) {
    const pages = new Set();
    const parts = rangeStr.replace(/\s+/g, '').split(',');
    
    for (const part of parts) {
        if (!part) continue;
        
        if (part.includes('-')) {
            const limits = part.split('-');
            const start = parseInt(limits[0]);
            const end = parseInt(limits[1]);
            
            if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
                const s = Math.min(start, end);
                const e = Math.min(Math.max(start, end), maxPages);
                for (let i = s; i <= e; i++) {
                    pages.add(i);
                }
            }
        } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= maxPages) {
                pages.add(pageNum);
            }
        }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
}
