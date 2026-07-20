/**
 * Tool: Images to PDF
 */

import { readFileAsDataURL, readFileAsArrayBuffer, initDragAndSort } from '../utils.js';

let loadedImages = [];

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="page-size">Page Size</label>
            <select id="page-size" class="form-control">
                <option value="fit">Fit to Image Size</option>
                <option value="a4">Standard A4</option>
                <option value="letter">US Letter</option>
            </select>
        </div>
        <div class="form-group">
            <label for="page-orientation">Orientation</label>
            <select id="page-orientation" class="form-control">
                <option value="auto">Auto-detect</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
            </select>
        </div>
        <div class="form-group">
            <label for="page-margin">Margin</label>
            <select id="page-margin" class="form-control">
                <option value="0">No Margins</option>
                <option value="15">Small (15px)</option>
                <option value="30">Large (30px)</option>
            </select>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    loadedImages = [...files];
    container.innerHTML = '<div class="file-list-grid" id="img2pdf-file-list"></div>';
    
    const fileListElement = document.getElementById('img2pdf-file-list');
    await updateImageList(fileListElement, utils);
    
    // Set up drag-and-drop reordering
    initDragAndSort(fileListElement, () => {
        const reorderedImages = [];
        const cardElements = fileListElement.querySelectorAll('.file-thumb-card');
        cardElements.forEach(card => {
            const index = parseInt(card.getAttribute('data-index'));
            reorderedImages.push(loadedImages[index]);
        });
        loadedImages = reorderedImages;
        
        cardElements.forEach((card, idx) => {
            card.setAttribute('data-index', idx);
        });
    });
}

async function updateImageList(container, utils) {
    container.innerHTML = '';
    
    for (let i = 0; i < loadedImages.length; i++) {
        const file = loadedImages[i];
        
        const card = document.createElement('div');
        card.className = 'file-thumb-card';
        card.setAttribute('data-index', i);
        card.innerHTML = `
            <div class="card-remove-btn" title="Remove image"><i data-lucide="x" style="width:14px;height:14px;"></i></div>
            <div class="file-thumb-canvas-container">
                <div class="spinner"></div>
            </div>
            <span class="file-name" title="${file.name}">${file.name}</span>
            <span class="file-info">${utils.formatBytes(file.size)}</span>
        `;
        
        container.appendChild(card);
        lucide.createIcons();

        card.querySelector('.card-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(card.getAttribute('data-index'));
            loadedImages.splice(index, 1);
            if (loadedImages.length === 0) {
                document.getElementById('btn-reset-tool').click();
            } else {
                updateImageList(container, utils);
            }
        });

        // Load image as preview
        try {
            const dataUrl = await readFileAsDataURL(file);
            const imgElement = document.createElement('img');
            imgElement.src = dataUrl;
            imgElement.style.maxWidth = '100%';
            imgElement.style.maxHeight = '100%';
            imgElement.style.objectFit = 'contain';
            
            const canvasContainer = card.querySelector('.file-thumb-canvas-container');
            
            imgElement.onload = () => {
                canvasContainer.innerHTML = '';
                canvasContainer.appendChild(imgElement);
                card.querySelector('.file-info').textContent = `${imgElement.naturalWidth}x${imgElement.naturalHeight} | ${utils.formatBytes(file.size)}`;
            };
        } catch (err) {
            console.error('Error rendering image preview:', err);
            const canvasContainer = card.querySelector('.file-thumb-canvas-container');
            canvasContainer.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--error)"></i>';
            lucide.createIcons();
        }
    }
}

export async function process(files, options, progressCallback) {
    if (loadedImages.length === 0) throw new Error('No images to process.');

    progressCallback(10, 'Initializing PDF creator...');
    const pdfDoc = await PDFLib.PDFDocument.create();

    const pageSizeOpt = options['page-size'] || 'fit';
    const orientation = options['page-orientation'] || 'auto';
    const margin = parseInt(options['page-margin'] || '0');

    // Page dimensions constants for standard sizes
    const A4 = { width: 595.27, height: 841.89 };
    const LETTER = { width: 612.0, height: 792.0 };

    for (let i = 0; i < loadedImages.length; i++) {
        const file = loadedImages[i];
        const pct = Math.floor(10 + (i / loadedImages.length) * 75);
        progressCallback(pct, `Processing: ${file.name}...`);

        try {
            // Load file content as DataURL
            const dataUrl = await readFileAsDataURL(file);
            
            // Draw image on a canvas to normalize format to standard JPG
            const img = await new Promise((resolve, reject) => {
                const imgElement = new Image();
                imgElement.onload = () => resolve(imgElement);
                imgElement.onerror = (e) => reject(new Error('Failed to load image file: ' + file.name));
                imgElement.src = dataUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Export as standard JPEG
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const response = await fetch(jpegDataUrl);
            const arrayBuffer = await response.arrayBuffer();

            // Embed into PDF
            const pdfImage = await pdfDoc.embedJpg(arrayBuffer);
            const imgWidth = pdfImage.width;
            const imgHeight = pdfImage.height;

            let pageWidth = imgWidth;
            let pageHeight = imgHeight;

            // Determine dimensions based on settings
            if (pageSizeOpt === 'a4') {
                pageWidth = A4.width;
                pageHeight = A4.height;
            } else if (pageSizeOpt === 'letter') {
                pageWidth = LETTER.width;
                pageHeight = LETTER.height;
            }

            // Adjust dimensions for orientation (if not 'fit')
            if (pageSizeOpt !== 'fit') {
                const isLandscape = orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight);
                if (isLandscape) {
                    const temp = pageWidth;
                    pageWidth = Math.max(pageWidth, pageHeight);
                    pageHeight = Math.min(temp, pageHeight);
                } else {
                    const temp = pageWidth;
                    pageWidth = Math.min(pageWidth, pageHeight);
                    pageHeight = Math.max(temp, pageHeight);
                }
            } else {
                // If fitting image, page size is image size + margins
                pageWidth = imgWidth + margin * 2;
                pageHeight = imgHeight + margin * 2;
            }

            // Calculate display rectangle fitting inside margins
            const maxWidth = pageWidth - margin * 2;
            const maxHeight = pageHeight - margin * 2;
            
            const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
            const displayWidth = imgWidth * scale;
            const displayHeight = imgHeight * scale;

            const posX = margin + (maxWidth - displayWidth) / 2;
            const posY = margin + (maxHeight - displayHeight) / 2;

            // Add page
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            
            // Draw image on page
            page.drawImage(pdfImage, {
                x: posX,
                y: posY,
                width: displayWidth,
                height: displayHeight,
            });

        } catch (err) {
            console.error(`Failed to embed image ${file.name}:`, err);
            throw new Error(`Failed to embed image ${file.name}: ${err.message}`);
        }
    }

    progressCallback(88, 'Saving document...');
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `Images_${Date.now()}.pdf`;

    progressCallback(100, 'PDF Creation Complete!');
    return { blob, filename };
}
