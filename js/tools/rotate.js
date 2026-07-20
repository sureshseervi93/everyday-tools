/**
 * Tool: Rotate PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;
let pageRotations = []; // Holds numbers (0, 90, 180, 270) indexed by 0-based page index

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label>Bulk Actions</label>
            <button class="btn-secondary btn-block mb-2" id="btn-rotate-all-cw" style="margin-bottom:8px;font-size:0.85rem;padding:8px 12px;">
                <i data-lucide="rotate-cw" style="width:14px;height:14px;"></i> Rotate All Clockwise
            </button>
            <button class="btn-secondary btn-block" id="btn-rotate-all-ccw" style="font-size:0.85rem;padding:8px 12px;">
                <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Rotate All Counter-CW
            </button>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                Click the rotate icon on individual page cards to rotate only that page.
            </p>
        </div>
    `;

    // CW
    document.getElementById('btn-rotate-all-cw').addEventListener('click', () => {
        const cards = document.querySelectorAll('#rotate-pages-grid .file-thumb-card');
        cards.forEach((card, idx) => {
            pageRotations[idx] = (pageRotations[idx] + 90) % 360;
            applyRotationClass(card, pageRotations[idx]);
        });
    });

    // CCW
    document.getElementById('btn-rotate-all-ccw').addEventListener('click', () => {
        const cards = document.querySelectorAll('#rotate-pages-grid .file-thumb-card');
        cards.forEach((card, idx) => {
            pageRotations[idx] = (pageRotations[idx] - 90 + 360) % 360;
            applyRotationClass(card, pageRotations[idx]);
        });
    });
}

function applyRotationClass(card, deg) {
    card.classList.remove('rotated-90', 'rotated-180', 'rotated-270');
    if (deg === 90) card.classList.add('rotated-90');
    if (deg === 180) card.classList.add('rotated-180');
    if (deg === 270) card.classList.add('rotated-270');
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name}
        </div>
        <div class="file-list-grid" id="rotate-pages-grid"></div>
    `;

    const grid = document.getElementById('rotate-pages-grid');

    try {
        const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
        const pdfDoc = await loadPdfDoc(arrayBuffer);
        const numPages = pdfDoc.numPages;
        
        pageRotations = new Array(numPages).fill(0);

        for (let i = 1; i <= numPages; i++) {
            const card = document.createElement('div');
            card.className = 'file-thumb-card';
            card.setAttribute('data-index', i - 1);
            card.innerHTML = `
                <div class="badge-rotate" title="Rotate page"><i data-lucide="rotate-cw" style="width:14px;height:14px;"></i></div>
                <div class="file-thumb-canvas-container">
                    <div class="spinner"></div>
                </div>
                <span class="file-name">Page ${i}</span>
            `;
            grid.appendChild(card);
            
            // Handle individual page rotation
            card.querySelector('.badge-rotate').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = i - 1;
                pageRotations[idx] = (pageRotations[idx] + 90) % 360;
                applyRotationClass(card, pageRotations[idx]);
            });

            // Async page render
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

    } catch (err) {
        console.error('Error loading rotate previews:', err);
        container.innerHTML = `<p class="text-center" style="color: var(--error)">Failed to load previews: ${err.message}</p>`;
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');

    progressCallback(20, 'Reading PDF document...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = srcPdf.getPages();

    progressCallback(50, 'Applying rotations...');
    pages.forEach((page, idx) => {
        const rotationToAdd = pageRotations[idx] || 0;
        if (rotationToAdd !== 0) {
            // Get original page rotation, and add new rotation
            const currentRotation = page.getRotation().angle;
            const newRotation = (currentRotation + rotationToAdd) % 360;
            page.setRotation(PDFLib.degrees(newRotation));
        }
    });

    progressCallback(80, 'Saving rotated document...');
    const pdfBytes = await srcPdf.save();
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Rotated.pdf`;

    progressCallback(100, 'Rotation Complete!');
    return { blob, filename };
}
