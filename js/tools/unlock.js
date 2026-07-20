/**
 * Tool: Unlock PDF
 */

import { readFileAsArrayBuffer, loadPdfDoc } from '../utils.js';

let loadedFile = null;

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="pdf-unlock-password">PDF Password</label>
            <input type="password" id="pdf-unlock-password" class="form-control" placeholder="Enter password to unlock" required>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
                Entering the correct password will remove the lock encryption completely. All calculations occur client-side.
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
        <div class="file-list-grid" id="unlock-preview-grid">
            <div class="file-thumb-card">
                <div class="file-thumb-canvas-container" id="unlock-preview-canvas">
                    <i data-lucide="lock" style="color:var(--accent);width:32px;height:32px;"></i>
                </div>
                <span class="file-name">Encrypted Document</span>
            </div>
        </div>
    `;
    lucide.createIcons();
}

export async function process(files, options, progressCallback) {
    if (!loadedFile) throw new Error('No PDF file loaded.');
    
    const password = options['pdf-unlock-password'];
    if (!password) throw new Error('Please enter the password to unlock this file.');

    progressCallback(25, 'Loading and decrypting PDF...');
    const arrayBuffer = await readFileAsArrayBuffer(loadedFile);
    
    try {
        // Load with password. This decrypts objects in memory.
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { password });
        
        progressCallback(65, 'Saving unencrypted document...');
        
        // Save without passwords, saving it as standard unencrypted document
        const decryptedBytes = await pdfDoc.save();
        
        const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
        const filename = `${loadedFile.name.replace('.pdf', '')}_Unlocked.pdf`;
        
        progressCallback(100, 'Decrypt Complete!');
        return { blob, filename };
    } catch (err) {
        throw new Error('Decryption failed. Please make sure the password is correct. Error: ' + err.message);
    }
}
