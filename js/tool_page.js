/**
 * Everyday Tools - Standalone Tool Page Runtime Controller
 */

import { formatBytes } from './utils.js';

// Tool Registry for checking details
const TOOLS = [
    { id: 'merge', name: 'Merge PDF' },
    { id: 'split', name: 'Split PDF' },
    { id: 'organize', name: 'Organize Pages' },
    { id: 'rotate', name: 'Rotate PDF' },
    { id: 'pdf2img', name: 'PDF to Images' },
    { id: 'img2pdf', name: 'Images to PDF' },
    { id: 'text2pdf', name: 'Text to PDF' },
    { id: 'compress', name: 'Compress PDF' },
    { id: 'protect', name: 'Protect PDF' },
    { id: 'unlock', name: 'Unlock PDF' },
    { id: 'watermark', name: 'Add Watermark' },
    { id: 'pagenumber', name: 'Page Numbers' },
    { id: 'sign', name: 'Sign PDF' },
    { id: 'mp3crop', name: 'MP3 Cropper' },
    { id: 'mp4tomp3', name: 'MP4 to MP3' },
    { id: 'calculator', name: 'Smart Calculator' },
    { id: 'qrcode', name: 'QR Code Creator' }
];

const noFileTools = ['calculator', 'qrcode'];

// App State
let currentToolId = '';
let currentToolMeta = null;
let activeToolModule = null;
let currentFiles = [];
let processedResultBlob = null;
let processedResultFilename = '';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileClose = document.getElementById('mobile-close');
const themeToggle = document.getElementById('theme-toggle');
const toolDropzone = document.getElementById('tool-dropzone');
const fileInput = document.getElementById('file-input');
const editorWorkspace = document.getElementById('editor-workspace');
const editorMainArea = document.getElementById('editor-main-area');
const dynamicOptionsPanel = document.getElementById('dynamic-options-panel');
const btnProcessFiles = document.getElementById('btn-process-files');
const processingState = document.getElementById('processing-state');
const processingText = document.getElementById('processing-text');
const processingProgress = document.getElementById('processing-progress');
const successState = document.getElementById('success-state');
const successMessage = document.getElementById('success-message');
const btnDownloadResult = document.getElementById('btn-download-result');
const btnResetTool = document.getElementById('btn-reset-tool');
const toastContainer = document.getElementById('toast-container');

// Initialize application on load
document.addEventListener('DOMContentLoaded', async () => {
    // Resolve active tool
    currentToolId = document.body.dataset.toolId || '';
    currentToolMeta = TOOLS.find(t => t.id === currentToolId);

    if (!currentToolMeta) {
        console.error('Active tool metadata not found.');
        return;
    }

    initThemes();
    initNavigation();
    await loadToolWorkspace();
    
    // Refresh icons
    lucide.createIcons();
});

// Theme Management
function initThemes() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Navigation event links
function initNavigation() {
    // Mobile navigation
    mobileToggle.addEventListener('click', () => sidebar.classList.add('open'));
    mobileClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // Highlight active tool in sidebar
    const targetLink = sidebar.querySelector(`.nav-item[data-target="${currentToolId === 'rotate' ? 'rotate-tool' : currentToolId}"]`);
    if (targetLink) {
        // Clear default active classes
        sidebar.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
        targetLink.classList.add('active');
    }

    // Header category dropdown
    const dropdownTrigger = document.getElementById('dropdown-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && e.target !== dropdownTrigger) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // About Modal triggers
    const navAboutBtn = document.getElementById('nav-about-btn');
    const aboutModal = document.getElementById('about-modal');
    const btnCloseAboutModal = document.getElementById('btn-close-about-modal');
    const btnCloseAboutModalOk = document.getElementById('btn-close-about-modal-ok');

    if (navAboutBtn && aboutModal) {
        const openModal = () => aboutModal.classList.remove('hidden');
        const closeModal = () => aboutModal.classList.add('hidden');

        navAboutBtn.addEventListener('click', openModal);
        btnCloseAboutModal.addEventListener('click', closeModal);
        btnCloseAboutModalOk.addEventListener('click', closeModal);
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) closeModal();
        });
    }
}

// Load Workspace
async function loadToolWorkspace() {
    currentFiles = [];
    activeToolModule = null;

    // Reset workspace UI views
    toolDropzone.classList.remove('hidden');
    editorWorkspace.classList.add('hidden');
    processingState.classList.add('hidden');
    successState.classList.add('hidden');
    fileInput.value = '';

    // Clamp upload formats based on tool
    if (currentToolId === 'img2pdf') {
        fileInput.accept = 'image/png, image/jpeg, image/webp, image/heic';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PNG, JPG, WEBP, HEIC';
    } else if (currentToolId === 'text2pdf') {
        fileInput.accept = '.txt, .md';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports TXT, MD text files';
    } else if (currentToolId === 'mp3crop') {
        fileInput.accept = '.mp3, .wav';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports MP3, WAV audio files';
    } else if (currentToolId === 'mp4tomp3') {
        fileInput.accept = '.mp4, .webm, .mov, .avi';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports MP4, WebM, MOV, AVI video files';
    } else {
        fileInput.accept = '.pdf';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PDF documents';
    }

    // Dynamic import of tool logic
    try {
        const modulePath = `./tools/${currentToolId}.js`;
        activeToolModule = await import(modulePath);
        
        // Render specific options inside options sidebar
        dynamicOptionsPanel.innerHTML = '';
        if (activeToolModule.renderOptions) {
            activeToolModule.renderOptions(dynamicOptionsPanel);
        }

        // Bypassing file-upload dropzone screen for no-file tools
        if (noFileTools.includes(currentToolId)) {
            toolDropzone.classList.add('hidden');
            editorWorkspace.classList.remove('hidden');
            if (btnProcessFiles) btnProcessFiles.classList.add('hidden');
            
            if (activeToolModule.renderWorkspace) {
                editorMainArea.innerHTML = '';
                await activeToolModule.renderWorkspace(editorMainArea, [], { formatBytes });
            }
        } else {
            if (btnProcessFiles) btnProcessFiles.classList.remove('hidden');
            initUploadEvents();
            initProcessEvents();
        }

        // Enable Lucide icons
        lucide.createIcons();
    } catch (err) {
        console.error(`Failed to load module: ${currentToolId}`, err);
        showToast('Failed to load tool options. Please try refreshing.', 'error');
    }
}

// Drag & Drop Handling
function initUploadEvents() {
    // Prevent double binding
    if (toolDropzone.dataset.bound) return;
    toolDropzone.dataset.bound = 'true';

    toolDropzone.addEventListener('click', () => fileInput.click());
    
    toolDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        toolDropzone.classList.add('dragover');
    });
    
    toolDropzone.addEventListener('dragleave', () => {
        toolDropzone.classList.remove('dragover');
    });
    
    toolDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        toolDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files);
        }
    });
}

async function handleFileUpload(filesList) {
    const filesArray = Array.from(filesList);
    
    // Simple verification check
    if (currentToolId !== 'img2pdf' && currentToolId !== 'merge' && filesArray.length > 1) {
        // Multi-file only allowed for Merge & Images to PDF
        showToast('This tool only supports single-file inputs.', 'warning');
        currentFiles = [filesArray[0]];
    } else {
        currentFiles = filesArray;
    }

    toolDropzone.classList.add('hidden');
    editorWorkspace.classList.remove('hidden');
    
    // Render Workspace
    editorMainArea.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:200px;">
            <div class="spinner"></div>
        </div>
    `;
    
    try {
        if (activeToolModule && activeToolModule.renderWorkspace) {
            await activeToolModule.renderWorkspace(editorMainArea, currentFiles, { formatBytes });
        } else {
            // Default placeholder list
            editorMainArea.innerHTML = `
                <div style="padding:20px;">
                    <h3>Uploaded Files:</h3>
                    <ul>
                        ${currentFiles.map(f => `<li>${f.name} (${formatBytes(f.size)})</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error rendering tool workspace:', err);
        showToast('Error displaying file preview.', 'error');
    }
    
    lucide.createIcons();
}

// Action Processing
function initProcessEvents() {
    if (btnProcessFiles.dataset.bound) return;
    btnProcessFiles.dataset.bound = 'true';

    btnProcessFiles.addEventListener('click', async () => {
        if (currentFiles.length === 0) {
            showToast('Please upload files to process.', 'warning');
            return;
        }

        // Gather options inputs
        const options = {};
        dynamicOptionsPanel.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox') {
                options[el.id] = el.checked;
            } else {
                options[el.id] = el.value;
            }
        });

        // Toggle Loading views
        editorWorkspace.classList.add('hidden');
        processingState.classList.remove('hidden');
        processingText.textContent = 'Processing files client-side...';
        processingProgress.style.width = '10%';

        try {
            if (activeToolModule && activeToolModule.process) {
                const result = await activeToolModule.process(currentFiles, options, (pct, statusText) => {
                    processingProgress.style.width = `${pct}%`;
                    if (statusText) processingText.textContent = statusText;
                });
                
                processedResultBlob = result.blob;
                processedResultFilename = result.filename;
                
                // Show Success Output Card
                processingState.classList.add('hidden');
                successState.classList.remove('hidden');
                successMessage.innerHTML = `
                    <strong>Process Completed!</strong><br>
                    File "${processedResultFilename}" (${formatBytes(processedResultBlob.size)}) is ready for download.
                `;
                
                showToast('Processing complete!', 'success');
            } else {
                throw new Error('Process method not implemented.');
            }
        } catch (err) {
            console.error('Process Execution Error:', err);
            showToast(err.message || 'Processing failed.', 'error');
            
            processingState.classList.add('hidden');
            editorWorkspace.classList.remove('hidden');
        }
    });

    // Save Download
    btnDownloadResult.addEventListener('click', () => {
        if (!processedResultBlob) return;
        
        const url = URL.createObjectURL(processedResultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = processedResultFilename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Download started', 'success');
    });

    // Reset Workspace
    btnResetTool.addEventListener('click', () => {
        processedResultBlob = null;
        processedResultFilename = '';
        loadToolWorkspace();
    });
}

// Toast Notification Panel
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <div class="toast-content">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 4000);
}
