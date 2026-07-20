/**
 * Tool: Organize Pages
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas, initDragAndSort } from '../utils.js';

let loadedFile = null;
let pageSequence = []; // Holds objects: { originalIndex: number, uuid: string }

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                Drag pages to change their order. Click the red <strong>X</strong> on a page to delete it.
            </p>
        </div>
        <div class="form-group">
            <button class="btn-secondary btn-block" id="btn-reset-organizer" style="font-size:0.8rem;padding:8px 12px;">
                <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Reset to Original
            </button>
        </div>
    `;

    document.getElementById('btn-reset-organizer').addEventListener('click', () => {
        if (loadedFile) {
            // Re-render workspace to reset state
            const event = new CustomEvent('reset-organize');
            document.dispatchEvent(event);
        }
    });
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    
    const render = async () => {
        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div><strong>File:</strong> ${loadedFile.name}</div>
                <div id="pages-tracker-badge" class="dropzone-hint">Pages: 0</div>
            </div>
            <div class="file-list-grid" id="organize-pages-grid"></div>
        `;

        const grid = document.getElementById('organize-pages-grid');
        const badge = document.getElementById('pages-tracker-badge');

        try {
            const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
            const pdfDoc = await loadPdfDoc(arrayBuffer);
            const numPages = pdfDoc.numPages;
            
            badge.textContent = `Pages: ${numPages}`;
            pageSequence = [];

            for (let i = 1; i <= numPages; i++) {
                const uuid = 'page-' + Math.random().toString(36).substr(2, 9);
                pageSequence.push({ originalIndex: i, uuid });
                
                const card = document.createElement('div');
                card.className = 'file-thumb-card';
                card.setAttribute('data-uuid', uuid);
                card.innerHTML = `
                    <div class="card-remove-btn" title="Delete page"><i data-lucide="x" style="width:14px;height:14px;"></i></div>
                    <div class="file-thumb-canvas-container">
                        <div class="spinner"></div>
                    </div>
                    <span class="file-name">Page ${i}</span>
                `;
                grid.appendChild(card);
                
                // Load thumbnail
                renderPdfPageToCanvas(pdfDoc, i, 0.4).then(canvas => {
                    const canvasContainer = card.querySelector('.file-thumb-canvas-container');
                    canvasContainer.innerHTML = '';
                    canvasContainer.appendChild(canvas);
                }).catch(err => {
                    const canvasContainer = card.querySelector('.file-thumb-canvas-container');
                    canvasContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
                    lucide.createIcons();
                });
            }

            lucide.createIcons();
            
            // Set up reordering
            initDragAndSort(grid, () => {
                const newSequence = [];
                const cards = grid.querySelectorAll('.file-thumb-card');
                cards.forEach(card => {
                    const uuid = card.getAttribute('data-uuid');
                    const seqItem = pageSequence.find(item => item.uuid === uuid);
                    if (seqItem) {
                        newSequence.push(seqItem);
                    }
                });
                pageSequence = newSequence;
            });

            // Bind page removal
            grid.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.card-remove-btn');
                if (!removeBtn) return;
                
                const card = removeBtn.closest('.file-thumb-card');
                const uuid = card.getAttribute('data-uuid');
                
                // Remove from sequence list and remove element
                const index = pageSequence.findIndex(item => item.uuid === uuid);
                if (index > -1) {
                    pageSequence.splice(index, 1);
                }
                card.remove();
                
                badge.textContent = `Pages: ${pageSequence.length}`;
                if (pageSequence.length === 0) {
                    document.getElementById('btn-reset-tool').click();
                }
            });

        } catch (err) {
            console.error('Error loading organizer pages:', err);
            container.innerHTML = `<p class="text-center" style="color: var(--error)">Failed to load previews: ${err.message}</p>`;
        }
    };

    await render();

    // Listen for custom reset event
    document.addEventListener('reset-organize', async () => {
        await render();
    }, { once: true });
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');
    if (pageSequence.length === 0) throw new Error('Cannot save empty PDF.');

    progressCallback(15, 'Reading original PDF...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);

    progressCallback(40, 'Re-compiling document pages...');
    const targetPdf = await PDFLib.PDFDocument.create();

    // originalIndex is 1-based, pdf-lib copiedPages are 0-based
    const indicesToCopy = pageSequence.map(item => item.originalIndex - 1);
    
    // Copy pages
    const copiedPages = await targetPdf.copyPages(srcPdf, indicesToCopy);
    copiedPages.forEach(page => targetPdf.addPage(page));

    progressCallback(80, 'Saving changes...');
    const pdfBytes = await targetPdf.save();
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Organized.pdf`;

    progressCallback(100, 'Organizing Complete!');
    return { blob, filename };
}
