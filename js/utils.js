/**
 * Shared utility functions for DocuForge
 */

/**
 * Format bytes to human readable format (KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Read a file as ArrayBuffer using a Promise
 */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Read a file as DataURL (base64 string) using a Promise
 */
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Load a PDF file and return the PDFJS document object
 */
export async function loadPdfDoc(arrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return await loadingTask.promise;
}

/**
 * Render a PDF page onto a canvas element
 * Returns a Promise that resolves to the Canvas
 */
export async function renderPdfPageToCanvas(pdfDoc, pageNumber, scale = 0.5) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    return canvas;
}

/**
 * Set up drag and drop sorting for a list container
 * @param {HTMLElement} container The parent element containing items to drag-and-drop
 * @param {Function} onReorder Callback function invoked when items are reordered
 */
export function initDragAndSort(container, onReorder) {
    let dragSrcEl = null;

    function handleDragStart(e) {
        this.classList.add('dragging');
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault(); 
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation(); 
        }
        
        if (dragSrcEl !== this) {
            // Find coordinates and switch items in DOM
            const children = Array.from(container.children);
            const fromIndex = children.indexOf(dragSrcEl);
            const toIndex = children.indexOf(this);
            
            if (fromIndex < toIndex) {
                container.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                container.insertBefore(dragSrcEl, this);
            }
            
            if (typeof onReorder === 'function') {
                onReorder();
            }
        }
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        const items = container.querySelectorAll('.file-thumb-card');
        items.forEach(item => {
            item.classList.remove('over');
        });
    }

    // Attach listeners
    function attachEvents(item) {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
    }

    // Observe changes inside container to re-apply events to new items
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                container.querySelectorAll('.file-thumb-card').forEach(item => {
                    attachEvents(item);
                });
            }
        });
    });

    observer.observe(container, { childList: true });

    // Initial setup
    container.querySelectorAll('.file-thumb-card').forEach(item => {
        attachEvents(item);
    });
}
