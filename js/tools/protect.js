/**
 * Tool: Protect PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc, renderPdfPageToCanvas } from '../utils.js';
import { encryptPDF } from 'https://esm.run/@pdfsmaller/pdf-encrypt-lite';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="pdf-password">Set Password</label>
            <input type="password" id="pdf-password" class="form-control" placeholder="Enter password to encrypt" required>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                This password will be required to open the PDF. Note: This encryption runs entirely locally in your browser.
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
        <div class="file-list-grid" id="protect-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="protect-preview-canvas">
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
        
        const previewContainer = document.getElementById('protect-preview-canvas');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    } catch (err) {
        console.error('Error rendering protect preview:', err);
        const previewContainer = document.getElementById('protect-preview-canvas');
        previewContainer.innerHTML = '<i data-lucide="lock" style="color:var(--primary);width:32px;height:32px;"></i>';
        lucide.createIcons();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');
    
    const password = options['pdf-password'];
    if (!password) throw new Error('Please enter a password.');

    progressCallback(20, 'Reading PDF bytes...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    
    progressCallback(60, 'Encrypting document...');
    
    try {
        const fileBytes = new Uint8Array(arrayBuffer);
        
        // Encrypt using the community package loaded from ESM CDN
        const encryptedBytes = await encryptPDF(fileBytes, password);
        
        const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
        const filename = `${loadedFile.name.replace('.pdf', '')}_Protected.pdf`;
        
        progressCallback(100, 'Encryption Complete!');
        return { blob, filename };
    } catch (err) {
        throw new Error('Encryption failed. Please try a simpler password or file. Error: ' + err.message);
    }
}
