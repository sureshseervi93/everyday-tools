/**
 * Everyday Tools - Homepage Dashboard Controller
 */

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

// DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileClose = document.getElementById('mobile-close');
const themeToggle = document.getElementById('theme-toggle');
const toolSearch = document.getElementById('tool-search');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initThemes();
    renderDashboard();
    initNavigation();
    
    // Check if page loaded with a category filter in the hash
    handleCategoryHash();
    window.addEventListener('hashchange', handleCategoryHash);
    
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
            window.location.href = `${tool.id}.html`;
        });

        grid.appendChild(card);
    });
    
    // Search filter
    toolSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.tool-card');
        const sectionGroups = document.querySelectorAll('.tool-section-group');
        
        if (query === '') {
            // Show all cards & groups
            cards.forEach(card => card.style.display = 'flex');
            sectionGroups.forEach(group => group.style.display = 'block');
            return;
        }
        
        // Filter cards
        cards.forEach(card => {
            const id = card.getAttribute('data-id');
            const tool = TOOLS.find(t => t.id === id);
            const name = tool.name.toLowerCase();
            const desc = tool.description.toLowerCase();
            
            if (name.includes(query) || desc.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Hide groups with no visible cards
        sectionGroups.forEach(group => {
            const visibleCards = group.querySelectorAll('.tool-card[style="display: flex;"]');
            const allCardsInGroup = group.querySelectorAll('.tool-card');
            
            // If all cards inside group have display: none, hide group
            let hasVisible = false;
            allCardsInGroup.forEach(c => {
                if (c.style.display !== 'none') hasVisible = true;
            });
            
            group.style.display = hasVisible ? 'block' : 'none';
        });
    });
}

// Router & Nav Layout
function initNavigation() {
    // Mobile Navigation triggers
    mobileToggle.addEventListener('click', () => sidebar.classList.add('open'));
    mobileClose.addEventListener('click', () => sidebar.classList.remove('open'));

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
            const category = link.getAttribute('data-cat');
            dropdownMenu.classList.remove('show');
            
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

function handleCategoryHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#cat-')) {
        const cat = hash.replace('#cat-', '');
        filterCategoryOnDashboard(cat);
    } else if (hash === '' || hash === '#dashboard') {
        resetCategoryFilters();
    }
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
            window.location.hash = '';
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
