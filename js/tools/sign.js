/**
 * Tool: Sign PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';

let loadedFile = null;
let signatureImageBytes = null; // Uint8Array of signature PNG
let signaturePlacement = null; // { x, y, width, height, pageNum }
let pdfDocDimensions = []; // [{ width, height }] indexed by 0-based page index

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label>Signature Mode</label>
            <div style="display:flex;gap:10px;margin-bottom:12px;">
                <button class="btn-secondary" id="mode-draw" style="flex:1;padding:6px;font-size:0.8rem;border-color:var(--primary);">Draw Signature</button>
                <button class="btn-secondary" id="mode-upload" style="flex:1;padding:6px;font-size:0.8rem;">Upload PNG</button>
            </div>
        </div>

        <!-- Draw Mode Section -->
        <div id="sign-draw-section">
            <div class="form-group">
                <label>Draw Signature Below</label>
                <div class="sig-canvas-container">
                    <canvas id="sig-pad"></canvas>
                </div>
                <div class="sig-actions">
                    <button class="btn-secondary" id="btn-clear-sig" style="padding:4px 10px;font-size:0.75rem;">Clear Pad</button>
                    <button class="btn-primary" id="btn-apply-sig" style="padding:4px 12px;font-size:0.75rem;box-shadow:none;">Apply Sign</button>
                </div>
            </div>
        </div>

        <!-- Upload Mode Section -->
        <div id="sign-upload-section" class="hidden">
            <div class="form-group">
                <label for="sig-image-input">Upload Transparent PNG Signature</label>
                <input type="file" id="sig-image-input" class="form-control" accept="image/png">
            </div>
        </div>

        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                After clicking <strong>Apply Sign</strong>, click on the document page on the left, drag it to position, and resize it before clicking <strong>Process Files</strong>.
            </p>
        </div>
    `;

    // Mode toggling logic
    const modeDraw = document.getElementById('mode-draw');
    const modeUpload = document.getElementById('mode-upload');
    const drawSection = document.getElementById('sign-draw-section');
    const uploadSection = document.getElementById('sign-upload-section');

    modeDraw.addEventListener('click', () => {
        modeDraw.style.borderColor = 'var(--primary)';
        modeUpload.style.borderColor = 'var(--border-color)';
        drawSection.classList.remove('hidden');
        uploadSection.classList.add('hidden');
    });

    modeUpload.addEventListener('click', () => {
        modeUpload.style.borderColor = 'var(--primary)';
        modeDraw.style.borderColor = 'var(--border-color)';
        uploadSection.classList.remove('hidden');
        drawSection.classList.add('hidden');
    });

    // Signature Pad canvas logic
    const canvas = document.getElementById('sig-pad');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function startDrawing(e) {
        drawing = true;
        const pos = getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function draw(e) {
        if (!drawing) return;
        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDrawing() {
        drawing = false;
    }

    // Touch support
    function startTouch(e) {
        if (e.target === canvas) e.preventDefault();
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        lastY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    }

    function drawTouch(e) {
        if (e.target === canvas) e.preventDefault();
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const currentX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const currentY = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        lastX = currentX;
        lastY = currentY;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startTouch);
    canvas.addEventListener('touchmove', drawTouch);
    canvas.addEventListener('touchend', stopDrawing);

    // Clear Button
    document.getElementById('btn-clear-sig').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        signatureImageBytes = null;
        removeOverlay();
    });

    // Apply Button
    document.getElementById('btn-apply-sig').addEventListener('click', () => {
        // Export canvas as PNG
        const dataUrl = canvas.toDataURL('image/png');
        
        // Check if canvas is blank/empty by testing pixels
        const blank = isCanvasBlank(canvas);
        if (blank) {
            alert('Please draw a signature first.');
            return;
        }

        prepareSignatureFromDataURL(dataUrl);
    });

    // Upload PNG File Input
    document.getElementById('sig-image-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            prepareSignatureFromDataURL(event.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

async function prepareSignatureFromDataURL(dataUrl) {
    // Save image bytes for PDF embedding
    const base64Data = dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    signatureImageBytes = bytes;

    // Create visual signature overlay in workspace
    const visualWorkspace = document.getElementById('visual-sig-workspace');
    if (!visualWorkspace) return;

    // Create draggable overlay
    removeOverlay();
    
    const pageContainer = visualWorkspace.querySelector('.sign-pdf-page-container');
    const overlay = document.createElement('div');
    overlay.className = 'draggable-signature-overlay';
    overlay.id = 'sig-overlay';
    overlay.style.width = '150px';
    overlay.style.height = '60px';
    overlay.style.left = '50px';
    overlay.style.top = '100px';
    
    overlay.innerHTML = `
        <div class="close-handle">X</div>
        <img src="${dataUrl}">
        <div class="resize-handle"></div>
    `;

    pageContainer.appendChild(overlay);

    // Setup visual signature dragging and resizing
    initOverlayInteraction(overlay, pageContainer);
}

function removeOverlay() {
    const existing = document.getElementById('sig-overlay');
    if (existing) existing.remove();
    signaturePlacement = null;
}

function initOverlayInteraction(overlay, parent) {
    let active = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 50;
    let yOffset = 100;

    // Drag handle
    overlay.addEventListener('mousedown', dragStart);
    overlay.addEventListener('touchstart', dragStart);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);

    function dragStart(e) {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('close-handle')) return;
        
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        active = true;
    }

    function drag(e) {
        if (!active) return;
        e.preventDefault();

        const parentRect = parent.getBoundingClientRect();
        
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        // Clamp to parent boundaries
        const maxX = parentRect.width - overlay.offsetWidth;
        const maxY = parentRect.height - overlay.offsetHeight;
        xOffset = Math.max(0, Math.min(currentX, maxX));
        yOffset = Math.max(0, Math.min(currentY, maxY));

        overlay.style.left = `${xOffset}px`;
        overlay.style.top = `${yOffset}px`;
        
        updatePlacementData(overlay, parent);
    }

    function dragEnd() {
        active = false;
    }

    // Resize handle
    const resizeHandle = overlay.querySelector('.resize-handle');
    let resizing = false;
    let startW, startH, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        startW = overlay.offsetWidth;
        startH = overlay.offsetHeight;
        startX = e.clientX;
        startY = e.clientY;
        
        const endResize = () => {
            resizing = false;
            document.removeEventListener('mouseup', endResize);
            document.removeEventListener('mousemove', doResize);
        };

        const doResize = (e) => {
            if (!resizing) return;
            const diffX = e.clientX - startX;
            const newWidth = Math.max(50, startW + diffX);
            // maintain 2.5:1 signature aspect ratio
            const newHeight = newWidth / 2.5; 

            // Clamp resize to boundary
            const left = overlay.offsetLeft;
            const top = overlay.offsetTop;
            if (left + newWidth <= parent.clientWidth && top + newHeight <= parent.clientHeight) {
                overlay.style.width = `${newWidth}px`;
                overlay.style.height = `${newHeight}px`;
                updatePlacementData(overlay, parent);
            }
        };

        document.addEventListener('mouseup', endResize);
        document.addEventListener('mousemove', doResize);
    });

    // Close handle
    overlay.querySelector('.close-handle').addEventListener('click', (e) => {
        e.stopPropagation();
        removeOverlay();
    });

    // Initial update
    updatePlacementData(overlay, parent);
}

function updatePlacementData(overlay, parent) {
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    
    // Scale positioning mapping relative to 1st page PDF coords (pdfDocDimensions[0])
    const pdfWidth = pdfDocDimensions[0].width;
    const pdfHeight = pdfDocDimensions[0].height;

    const scaleX = pdfWidth / parentWidth;
    const scaleY = pdfHeight / parentHeight;

    const left = overlay.offsetLeft;
    const top = overlay.offsetTop;
    const width = overlay.offsetWidth;
    const height = overlay.offsetHeight;

    // Convert screen coordinates to standard PDF coordinates (0,0 starting at bottom-left corner)
    signaturePlacement = {
        x: left * scaleX,
        y: (parentHeight - top - height) * scaleY,
        width: width * scaleX,
        height: height * scaleY,
        pageNum: 1 // Default to signing page 1
    };
}

export async function renderWorkspace(container, files, utils) {
    loadedFile = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong>File:</strong> ${loadedFile.name} (${utils.formatBytes(loadedFile.size)})
        </div>
        <div class="pdf-sign-visual-workspace" id="visual-sig-workspace">
            <div class="sign-pdf-page-container" id="sign-page-1-container" style="position:relative;">
                <div class="spinner" style="margin: 80px auto;"></div>
            </div>
        </div>
    `;

    const pageContainer = document.getElementById('sign-page-1-container');

    try {
        const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
        const pdfDoc = await loadPdfDoc(arrayBuffer);
        
        // Cache original dimensions
        const pages = pdfDoc.numPages;
        pdfDocDimensions = [];
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        pdfDocDimensions.push({ width: viewport.width, height: viewport.height });

        // Render page 1 canvas
        const canvas = await renderPdfPageToCanvas(pdfDoc, 1, 0.85); // 0.85 scale for editor space
        pageContainer.innerHTML = '';
        pageContainer.appendChild(canvas);
        
        // Match container size to canvas
        pageContainer.style.width = `${canvas.width}px`;
        pageContainer.style.height = `${canvas.height}px`;

    } catch (err) {
        console.error('Error rendering signature workspace page:', err);
        pageContainer.innerHTML = `<p style="color:var(--error);padding:40px;">Failed to load PDF preview: ${err.message}</p>`;
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');
    if (!signatureImageBytes || !signaturePlacement) {
        throw new Error('Please apply your signature and place it on the document first.');
    }

    progressCallback(20, 'Reading PDF document...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const signPage = pages[signaturePlacement.pageNum - 1];

    progressCallback(55, 'Embedding signature image...');
    
    // Embed signature PNG
    const pngImage = await pdfDoc.embedPng(signatureImageBytes);

    progressCallback(75, 'Drawing signature on page...');
    
    // Draw onto the specified coordinate system mapping
    signPage.drawImage(pngImage, {
        x: signaturePlacement.x,
        y: signaturePlacement.y,
        width: signaturePlacement.width,
        height: signaturePlacement.height
    });

    progressCallback(90, 'Saving signed PDF...');
    const signedPdfBytes = await pdfDoc.save();

    const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const filename = `${loadedFile.name.replace('.pdf', '')}_Signed.pdf`;

    progressCallback(100, 'Signature Embedded Successfully!');
    return { blob, filename };
}
