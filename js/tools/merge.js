/**
 * Tool: Merge PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas, initDragAndSort } from '../utils.js';

let loadedFiles = [];

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                Drag and drop the cards on the left to arrange them in the order you want them merged.
            </p>
        </div>
        <div class="form-group" style="margin-top: 20px;">
            <label class="flex align-center gap-2">
                <input type="checkbox" id="add-blank-page" style="width: 16px; height: 16px; accent-color: var(--primary);">
                <span>Add blank page if odd count (for double-sided printing)</span>
            </label>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    loadedFiles = [...files];
    container.innerHTML = '<div class="file-list-grid" id="merge-file-list"></div>';
    
    const fileListElement = document.getElementById('merge-file-list');
    await updateFileList(fileListElement, utils);
    
    // Set up drag-and-drop reordering
    initDragAndSort(fileListElement, () => {
        // Sync our local loadedFiles array with the new DOM order
        const reorderedFiles = [];
        const cardElements = fileListElement.querySelectorAll('.file-thumb-card');
        cardElements.forEach(card => {
            const index = parseInt(card.getAttribute('data-index'));
            reorderedFiles.push(loadedFiles[index]);
        });
        loadedFiles = reorderedFiles;
        
        // Re-index cards
        cardElements.forEach((card, idx) => {
            card.setAttribute('data-index', idx);
        });
    });
}

async function updateFileList(container, utils) {
    container.innerHTML = '';
    
    for (let i = 0; i < loadedFiles.length; i++) {
        const file = loadedFiles[i];
        
        // Create file thumbnail card
        const card = document.createElement('div');
        card.className = 'file-thumb-card';
        card.setAttribute('data-index', i);
        card.innerHTML = `
            <div class="card-remove-btn" title="Remove file"><i data-lucide="x" style="width:14px;height:14px;"></i></div>
            <div class="file-thumb-canvas-container">
                <div class="spinner"></div>
            </div>
            <span class="file-name" title="${file.name}">${file.name}</span>
            <span class="file-info">${utils.formatBytes(file.size)}</span>
        `;
        
        container.appendChild(card);
        lucide.createIcons();

        // Bind delete action
        card.querySelector('.card-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(card.getAttribute('data-index'));
            loadedFiles.splice(index, 1);
            if (loadedFiles.length === 0) {
                // Reset tool state
                document.getElementById('btn-reset-tool').click();
            } else {
                updateFileList(container, utils);
            }
        });

        // Async render the first page
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const pdfDoc = await loadPdfDoc(arrayBuffer);
            const numPages = pdfDoc.numPages;
            
            // Add page count to info label
            card.querySelector('.file-info').textContent = `${numPages} page(s) | ${utils.formatBytes(file.size)}`;
            
            const canvas = await renderPdfPageToCanvas(pdfDoc, 1, 0.4);
            const canvasContainer = card.querySelector('.file-thumb-canvas-container');
            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);
        } catch (err) {
            console.error('Error rendering page preview:', err);
            const canvasContainer = card.querySelector('.file-thumb-canvas-container');
            canvasContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
            lucide.createIcons();
        }
    }
}

export async function process(files, options, progressCallback) {
    if (loadedFiles.length === 0) throw new Error('No files to merge.');
    
    progressCallback(10, 'Reading PDF files...');
    const mergedPdf = await PDFLib.PDFDocument.create();
    
    for (let i = 0; i < loadedFiles.length; i++) {
        const file = loadedFiles[i];
        const step = Math.floor(10 + (i / loadedFiles.length) * 70);
        progressCallback(step, `Merging: ${file.name}...`);
        
        try {
            const fileBytes = await readFileAsArrayBuffer(file);
            const srcPdf = await PDFLib.PDFDocument.load(fileBytes);
            const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
            
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
            
            // Add blank page if option checked and page count is odd
            if (options['add-blank-page'] && srcPdf.getPageCount() % 2 !== 0) {
                // Copy size of last page to create matching blank page
                const lastPage = srcPdf.getPage(srcPdf.getPageCount() - 1);
                const { width, height } = lastPage.getSize();
                mergedPdf.addPage([width, height]);
            }
        } catch (err) {
            throw new Error(`Failed to load or merge ${file.name}: ${err.message}`);
        }
    }
    
    progressCallback(90, 'Saving merged PDF...');
    const mergedPdfBytes = await mergedPdf.save();
    
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const filename = `Merged_${Date.now()}.pdf`;
    
    progressCallback(100, 'Merge Complete!');
    return { blob, filename };
}
