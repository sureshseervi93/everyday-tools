/**
 * DocuForge App Orchestrator & Router
 */

import { formatBytes } from './utils.js';

// Tool Registry
const TOOLS = [
    // Organize
    { id: 'merge', name: 'Merge PDF', description: 'Combine multiple PDF files into one in any order you choose.', icon: 'combine', gradient: 'linear-gradient(135deg, #ff6b6b, #ee5253)', category: 'organize' },
    { id: 'split', name: 'Split PDF', description: 'Extract specific pages or split pages into individual files.', icon: 'scissors', gradient: 'linear-gradient(135deg, #ff9f43, #f368e0)', category: 'organize' },
    { id: 'organize', name: 'Organize Pages', description: 'Visual drag-and-drop interface to reorder or delete PDF pages.', icon: 'layout-grid', gradient: 'linear-gradient(135deg, #0abde3, #10ac84)', category: 'organize' },
    { id: 'rotate', name: 'Rotate PDF', description: 'Rotate pages of your PDF document and save them.', icon: 'rotate-cw', gradient: 'linear-gradient(135deg, #ee5253, #f368e0)', category: 'organize' },
    
    // Convert
    { id: 'pdf2img', name: 'PDF to Images', description: 'Convert PDF pages into high-quality JPG or PNG images.', icon: 'image', gradient: 'linear-gradient(135deg, #10ac84, #00d2d3)', category: 'convert' },
    { id: 'img2pdf', name: 'Images to PDF', description: 'Convert PNG, JPG, WEBP or HEIC images into a PDF document.', icon: 'file-image', gradient: 'linear-gradient(135deg, #2e86de, #48dbfb)', category: 'convert' },
    { id: 'text2pdf', name: 'Text to PDF', description: 'Convert markdown or formatted text documents into a clean PDF.', icon: 'file-text', gradient: 'linear-gradient(135deg, #341f97, #5f27cd)', category: 'convert' },
    
    // Security & Optimize
    { id: 'compress', name: 'Compress PDF', description: 'Reduce PDF file size while keeping optimal visual quality.', icon: 'compress', gradient: 'linear-gradient(135deg, #22c55e, #10b981)', category: 'security' },
    { id: 'protect', name: 'Protect PDF', description: 'Encrypt your PDF document with a strong password.', icon: 'lock', gradient: 'linear-gradient(135deg, #3c6382, #0a3d62)', category: 'security' },
    { id: 'unlock', name: 'Unlock PDF', description: 'Remove password security from your PDF (if password is known).', icon: 'unlock', gradient: 'linear-gradient(135deg, #f368e0, #ff9ff3)', category: 'security' },
    
    // Customization & Sign
    { id: 'watermark', name: 'Add Watermark', description: 'Overlay customizable text or images onto pages of your PDF.', icon: 'stamp', gradient: 'linear-gradient(135deg, #ff9f43, #ffb8b8)', category: 'sign' },
    { id: 'pagenumber', name: 'Page Numbers', description: 'Add page numbers to your PDF with placement controls.', icon: 'hash', gradient: 'linear-gradient(135deg, #5f27cd, #341f97)', category: 'sign' },
    { id: 'sign', name: 'Sign PDF', description: 'Draw or upload a signature and visually place it on your document.', icon: 'pen-tool', gradient: 'linear-gradient(135deg, #ff6b6b, #ff8585)', category: 'sign' },

    // Audio & Video
    { id: 'mp3crop', name: 'MP3 Cropper', description: 'Visually trim audio files client-side and download as MP3.', icon: 'music', gradient: 'linear-gradient(135deg, #00d2d3, #2e86de)', category: 'audio-video' },
    { id: 'mp4tomp3', name: 'MP4 to MP3', description: 'Extract audio track from MP4 video and convert it to MP3.', icon: 'video', gradient: 'linear-gradient(135deg, #ff9ff3, #f368e0)', category: 'audio-video' },
    
    // Utilities
    { id: 'calculator', name: 'Smart Calculator', description: 'A sleek Standard, Scientific, Mortgage, and BMI Calculator.', icon: 'calculator', gradient: 'linear-gradient(135deg, #10ac84, #1dd1a1)', category: 'utility' },
    { id: 'qrcode', name: 'QR Code Creator', description: 'Create customized QR codes with shapes, colors, and custom logo overlays.', icon: 'qr-code', gradient: 'linear-gradient(135deg, #ff9f43, #ee5253)', category: 'utility' }
];

// App State
let currentTool = null;
let currentFiles = [];
let activeToolModule = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileClose = document.getElementById('mobile-close');
const themeToggle = document.getElementById('theme-toggle');
const toolSearch = document.getElementById('tool-search');
const contentBody = document.getElementById('content-body');
const viewDashboard = document.getElementById('view-dashboard');
const viewToolWorkspace = document.getElementById('view-tool-workspace');
const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');
const workspaceTitle = document.getElementById('workspace-title');
const workspaceDescription = document.getElementById('workspace-description');
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

// Result storage
let processedResultBlob = null;
let processedResultFilename = '';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initThemes();
    renderDashboard();
    initNavigation();
    initUploadEvents();
    initProcessEvents();
    
    // Initial Routing
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    
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

// Render Tool Cards on Dashboard
function renderDashboard() {
    const categories = {
        organize: document.getElementById('grid-organize'),
        convert: document.getElementById('grid-convert'),
        security: document.getElementById('grid-security'),
        sign: document.getElementById('grid-sign'),
        'audio-video': document.getElementById('grid-audio-video'),
        utility: document.getElementById('grid-utility')
    };

    // Clear grids
    Object.values(categories).forEach(grid => {
        if (grid) grid.innerHTML = '';
    });

    TOOLS.forEach(tool => {
        const grid = categories[tool.category];
        if (!grid) return;

        const card = document.createElement('div');
        card.className = 'tool-card';
        card.setAttribute('data-id', tool.id);
        card.innerHTML = `
            <div class="card-icon" style="background: ${tool.gradient}; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
                <i data-lucide="${tool.icon}"></i>
            </div>
            <div class="card-content">
                <h3>${tool.name}</h3>
                <p>${tool.description}</p>
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.location.hash = `#${tool.id === 'rotate' ? 'rotate-tool' : tool.id}`;
        });

        grid.appendChild(card);
    });
    
    // Search filter
    toolSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.tool-card');
        
        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('p').textContent.toLowerCase();
            if (title.includes(query) || desc.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        // Hide headers if empty grid
        Object.keys(categories).forEach(cat => {
            const grid = categories[cat];
            const visibleCards = Array.from(grid.children).filter(c => c.style.display !== 'none');
            const groupHeader = grid.closest('.tool-section-group');
            if (visibleCards.length === 0) {
                groupHeader.style.display = 'none';
            } else {
                groupHeader.style.display = 'block';
            }
        });
    });
}

// Router & Nav Layout
function initNavigation() {
    // Back button
    btnBackToDashboard.addEventListener('click', () => {
        window.location.hash = '#dashboard';
    });

    // Mobile Navigation triggers
    mobileToggle.addEventListener('click', () => sidebar.classList.add('open'));
    mobileClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // Highlight sidebar links based on hash
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            sidebar.classList.remove('open');
        });
    });

    // Header Category Dropdown Toggle
    const dropdownTrigger = document.getElementById('dropdown-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');

    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== dropdownTrigger) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Category Dropdown clicks (Filter dashboard)
    dropdownMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.getAttribute('data-cat');
            dropdownMenu.classList.remove('show');
            
            // Go to dashboard
            window.location.hash = '#dashboard';
            
            // Filter categories on home
            filterCategoryOnDashboard(category);
        });
    });

    // About Modal Toggle
    const navAboutBtn = document.getElementById('nav-about-btn');
    const aboutModal = document.getElementById('about-modal');
    const btnCloseAboutModal = document.getElementById('btn-close-about-modal');
    const btnCloseAboutModalOk = document.getElementById('btn-close-about-modal-ok');

    const openModal = () => aboutModal.classList.remove('hidden');
    const closeModal = () => aboutModal.classList.add('hidden');

    navAboutBtn.addEventListener('click', openModal);
    btnCloseAboutModal.addEventListener('click', closeModal);
    btnCloseAboutModalOk.addEventListener('click', closeModal);
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) closeModal();
    });
}

// Filter categories helper
function filterCategoryOnDashboard(category) {
    const sectionGroups = document.querySelectorAll('.tool-section-group');
    sectionGroups.forEach(group => {
        const grid = group.querySelector('.tools-grid');
        const gridId = grid.getAttribute('id');
        
        if (gridId === `grid-${category}`) {
            group.style.display = 'block';
            setTimeout(() => {
                group.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            group.style.display = 'none';
        }
    });

    let resetFilterBtn = document.getElementById('reset-filter-banner');
    if (!resetFilterBtn) {
        resetFilterBtn = document.createElement('div');
        resetFilterBtn.id = 'reset-filter-banner';
        resetFilterBtn.style.cssText = 'display:flex; justify-content:center; margin-bottom:20px;';
        resetFilterBtn.innerHTML = `
            <button class="btn-secondary" style="padding:6px 14px; font-size:0.8rem; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Show All Categories
            </button>
        `;
        const hero = document.querySelector('.dashboard-hero');
        hero.parentNode.insertBefore(resetFilterBtn, hero.nextSibling);
        lucide.createIcons();

        resetFilterBtn.querySelector('button').addEventListener('click', () => {
            resetCategoryFilters();
        });
    }
}

function resetCategoryFilters() {
    const sectionGroups = document.querySelectorAll('.tool-section-group');
    sectionGroups.forEach(group => {
        group.style.display = 'block';
    });
    const banner = document.getElementById('reset-filter-banner');
    if (banner) banner.remove();
}

// Route handler
async function handleRoute() {
    let hash = window.location.hash.substring(1) || 'dashboard';
    
    // Normalize rotate hash to match tool ID
    if (hash === 'rotate-tool') hash = 'rotate';
    
    // Update active nav link
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const target = item.getAttribute('data-target');
        if (target === hash || (hash === 'dashboard' && target === 'dashboard')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (hash === 'dashboard') {
        showDashboard();
    } else {
        const tool = TOOLS.find(t => t.id === hash);
        if (tool) {
            await loadToolWorkspace(tool);
        } else {
            window.location.hash = '#dashboard';
        }
    }
}

function showDashboard() {
    resetCategoryFilters();
    viewToolWorkspace.classList.add('hidden');
    viewDashboard.classList.remove('active', 'hidden');
    viewDashboard.classList.add('active');
    currentTool = null;
    currentFiles = [];
}

async function loadToolWorkspace(tool) {
    currentTool = tool;
    currentFiles = [];
    activeToolModule = null;

    // Reset workspace UI
    viewDashboard.classList.add('hidden');
    viewDashboard.classList.remove('active');
    viewToolWorkspace.classList.remove('hidden');
    
    workspaceTitle.textContent = tool.name;
    workspaceDescription.textContent = tool.description;
    
    // Reset view states
    toolDropzone.classList.remove('hidden');
    editorWorkspace.classList.add('hidden');
    processingState.classList.add('hidden');
    successState.classList.add('hidden');
    
    // Reset file input
    fileInput.value = '';
    
    // Configure dropzone accept attribute based on tool
    if (tool.id === 'img2pdf') {
        fileInput.accept = 'image/png, image/jpeg, image/webp, image/heic';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PNG, JPG, WEBP, HEIC';
    } else if (tool.id === 'text2pdf') {
        fileInput.accept = '.txt, .md';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports TXT, MD text files';
    } else {
        fileInput.accept = '.pdf';
        toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PDF files';
    }

    // Dynamic import of tool logic
    try {
        const modulePath = `./tools/${tool.id}.js`;
        activeToolModule = await import(modulePath);
        
        // Render specific options inside options sidebar
        dynamicOptionsPanel.innerHTML = '';
        if (activeToolModule.renderOptions) {
            activeToolModule.renderOptions(dynamicOptionsPanel);
        }
        
        // Check if this tool bypasses file uploads
        const noFileTools = ['calculator', 'qrcode'];
        if (noFileTools.includes(tool.id)) {
            toolDropzone.classList.add('hidden');
            editorWorkspace.classList.remove('hidden');
            const processBtn = document.getElementById('btn-process-files');
            if (processBtn) processBtn.classList.add('hidden');
            
            if (activeToolModule.renderWorkspace) {
                editorMainArea.innerHTML = '';
                await activeToolModule.renderWorkspace(editorMainArea, [], { formatBytes });
            }
        } else {
            const processBtn = document.getElementById('btn-process-files');
            if (processBtn) processBtn.classList.remove('hidden');
        }

        // Enable Lucide icons inside options panel
        lucide.createIcons();
    } catch (err) {
        console.error(`Failed to load module for tool: ${tool.id}`, err);
        showToast(`Failed to load tool options. Please try refreshing.`, 'error');
    }
}

// Drag & Drop Handling
function initUploadEvents() {
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
            handleUploadedFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFiles(e.target.files);
        }
    });
}

// Process Uploaded Files
async function handleUploadedFiles(fileList) {
    if (!currentTool) return;
    
    const filesArray = Array.from(fileList);
    const validFiles = [];

    // Filter files based on tool constraints
    for (const file of filesArray) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (currentTool.id === 'img2pdf') {
            if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension)) {
                validFiles.push(file);
            }
        } else if (currentTool.id === 'text2pdf') {
            if (['txt', 'md'].includes(extension)) {
                validFiles.push(file);
            }
        } else {
            if (extension === 'pdf') {
                validFiles.push(file);
            }
        }
    }

    if (validFiles.length === 0) {
        showToast('Invalid file format. Please upload accepted files.', 'error');
        return;
    }

    // PDF length constraint (mostly split, rotate require single files, others support multiple)
    const singleFileTools = ['split', 'organize', 'rotate', 'pdf2img', 'compress', 'protect', 'unlock', 'watermark', 'pagenumber', 'sign'];
    if (singleFileTools.includes(currentTool.id) && validFiles.length > 1) {
        showToast(`This tool only supports single PDF processing. Loaded ${validFiles[0].name} only.`, 'warning');
        currentFiles = [validFiles[0]];
    } else {
        currentFiles = validFiles;
    }

    showToast(`Loaded ${currentFiles.length} file(s)`, 'success');
    
    // Hide dropzone and show loader state or visual editor
    toolDropzone.classList.add('hidden');
    editorWorkspace.classList.remove('hidden');
    
    // Trigger tool-specific workspace visualizer
    if (activeToolModule && activeToolModule.renderWorkspace) {
        editorMainArea.innerHTML = '<div class="text-center py-8"><div class="spinner m-auto"></div><p class="mt-4">Loading document previews...</p></div>';
        try {
            await activeToolModule.renderWorkspace(editorMainArea, currentFiles, { formatBytes });
        } catch (err) {
            console.error('Error rendering workspace:', err);
            showToast('Error loading previews. Operation still available.', 'warning');
            editorMainArea.innerHTML = `<div class="text-center py-8"><i data-lucide="file" style="width:48px;height:48px;"></i><p class="mt-4">${currentFiles.map(f => f.name).join(', ')} loaded.</p></div>`;
            lucide.createIcons();
        }
    } else {
        editorMainArea.innerHTML = `<div class="text-center py-8"><p>${currentFiles.map(f => f.name).join(', ')} loaded.</p></div>`;
    }
}

// Process Event Handling
function initProcessEvents() {
    btnProcessFiles.addEventListener('click', async () => {
        if (currentFiles.length === 0 || !activeToolModule) return;
        
        // Show Processing Screen
        editorWorkspace.classList.add('hidden');
        processingState.classList.remove('hidden');
        processingProgress.style.width = '0%';
        processingText.textContent = 'Processing files...';

        // Retrieve option forms data
        const options = {};
        if (dynamicOptionsPanel) {
            const inputs = dynamicOptionsPanel.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    options[input.id] = input.checked;
                } else {
                    options[input.id] = input.value;
                }
            });
        }

        try {
            // Execute the PDF engine operation
            const result = await activeToolModule.process(currentFiles, options, (percentage, text) => {
                processingProgress.style.width = `${percentage}%`;
                if (text) processingText.textContent = text;
            });

            if (result && (result.blob || result.zipBlob)) {
                processedResultBlob = result.blob || result.zipBlob;
                processedResultFilename = result.filename;

                // Show Success Screen
                processingState.classList.add('hidden');
                successState.classList.remove('hidden');
                successMessage.textContent = `"${processedResultFilename}" is ready for download.`;
                
                // Track success status
                showToast('Files processed successfully!', 'success');
            } else {
                throw new Error('Operation returned empty result.');
            }
        } catch (err) {
            console.error('Error during execution:', err);
            showToast(err.message || 'An error occurred during file processing.', 'error');
            
            // Revert back to Editor on failure
            processingState.classList.add('hidden');
            editorWorkspace.classList.remove('hidden');
        }
    });

    // Download click
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

    // Reset Click
    btnResetTool.addEventListener('click', () => {
        processedResultBlob = null;
        processedResultFilename = '';
        loadToolWorkspace(currentTool);
    });
}

// Toast alerts helper
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
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 4000);
}
