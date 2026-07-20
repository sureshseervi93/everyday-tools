/**
 * Tool: QR Code Creator
 */

let qrStylingInstance = null;
let logoDataUrl = '';

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="qr-data">QR Content (Text or URL)</label>
            <textarea id="qr-data" class="form-control" style="height: 80px; resize: none;" placeholder="Type text or enter website URL here...">Everyday Tools</textarea>
        </div>
        
        <div class="form-group">
            <label for="qr-dot-type">Dot Shape</label>
            <select id="qr-dot-type" class="form-control">
                <option value="square" selected>Square</option>
                <option value="dots">Dots</option>
                <option value="rounded">Rounded</option>
                <option value="extra-rounded">Extra Rounded</option>
                <option value="classy">Classy</option>
                <option value="classy-rounded">Classy Rounded</option>
            </select>
        </div>

        <div class="form-group">
            <label for="qr-corner-type">Corner Border Shape</label>
            <select id="qr-corner-type" class="form-control">
                <option value="square" selected>Square</option>
                <option value="dot">Dot</option>
                <option value="extra-rounded">Extra Rounded</option>
            </select>
        </div>

        <div class="form-group">
            <label for="qr-color-type">Color Mode</label>
            <select id="qr-color-type" class="form-control">
                <option value="solid" selected>Solid Color</option>
                <option value="gradient">Gradient Color</option>
            </select>
        </div>

        <!-- Solid Color Settings -->
        <div id="qr-solid-settings">
            <div class="form-group">
                <label for="qr-color-fg">QR Code Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="qr-color-fg" class="form-control" value="#6366f1" style="padding:0;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;">
                    <span id="qr-fg-hex">#6366f1</span>
                </div>
            </div>
        </div>

        <!-- Gradient Color Settings -->
        <div id="qr-gradient-settings" class="hidden">
            <div class="form-group">
                <label>Gradient Start / End</label>
                <div style="display:flex;gap:10px;">
                    <input type="color" id="qr-grad-start" class="form-control" value="#6366f1" style="padding:0;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;">
                    <input type="color" id="qr-grad-end" class="form-control" value="#a855f7" style="padding:0;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;">
                </div>
            </div>
            <div class="form-group">
                <label for="qr-grad-rotation">Gradient Rotation (deg)</label>
                <input type="number" id="qr-grad-rotation" class="form-control" value="45" min="0" max="360">
            </div>
        </div>

        <div class="form-group">
            <label for="qr-color-bg">Background Color</label>
            <div class="color-picker-wrapper">
                <input type="color" id="qr-color-bg" class="form-control" value="#ffffff" style="padding:0;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;">
                <span id="qr-bg-hex">#ffffff</span>
            </div>
        </div>

        <div class="form-group">
            <label for="qr-logo-upload">Embed Logo (Optional)</label>
            <input type="file" id="qr-logo-upload" class="form-control" accept="image/png, image/jpeg">
            <button class="btn-secondary btn-block mt-2 hidden" id="qr-btn-remove-logo" style="padding:4px;font-size:0.75rem;">
                Remove Embedded Logo
            </button>
        </div>

        <div class="form-group">
            <label for="qr-download-format">Download Format</label>
            <select id="qr-download-format" class="form-control">
                <option value="png" selected>PNG Image</option>
                <option value="svg">SVG Vector</option>
            </select>
        </div>

        <button class="btn-primary btn-block mt-4" id="qr-btn-download">
            <i data-lucide="download"></i> Download QR Code
        </button>
    `;

    // Visual helpers & logic listeners
    const colorFg = document.getElementById('qr-color-fg');
    const fgHex = document.getElementById('qr-fg-hex');
    colorFg.addEventListener('input', (e) => {
        fgHex.textContent = e.target.value;
        updateQRCode();
    });

    const colorBg = document.getElementById('qr-color-bg');
    const bgHex = document.getElementById('qr-bg-hex');
    colorBg.addEventListener('input', (e) => {
        bgHex.textContent = e.target.value;
        updateQRCode();
    });

    const colorType = document.getElementById('qr-color-type');
    const solidSettings = document.getElementById('qr-solid-settings');
    const gradSettings = document.getElementById('qr-gradient-settings');

    colorType.addEventListener('change', () => {
        if (colorType.value === 'gradient') {
            solidSettings.classList.add('hidden');
            gradSettings.classList.remove('hidden');
        } else {
            solidSettings.classList.remove('hidden');
            gradSettings.classList.add('hidden');
        }
        updateQRCode();
    });

    // Listen to changes for inputs to trigger auto update
    const elementsToUpdate = ['qr-data', 'qr-dot-type', 'qr-corner-type', 'qr-grad-start', 'qr-grad-end', 'qr-grad-rotation'];
    elementsToUpdate.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', updateQRCode);
        if (el.tagName === 'SELECT') {
            el.addEventListener('change', updateQRCode);
        }
    });

    // Handle logo uploads
    const logoUpload = document.getElementById('qr-logo-upload');
    const removeLogoBtn = document.getElementById('qr-btn-remove-logo');

    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            logoDataUrl = event.target.result;
            removeLogoBtn.classList.remove('hidden');
            updateQRCode();
        };
        reader.readAsDataURL(file);
    });

    removeLogoBtn.addEventListener('click', () => {
        logoDataUrl = '';
        logoUpload.value = '';
        removeLogoBtn.classList.add('hidden');
        updateQRCode();
    });

    // Bind Download Trigger
    document.getElementById('qr-btn-download').addEventListener('click', () => {
        if (!qrStylingInstance) return;
        const format = document.getElementById('qr-download-format').value || 'png';
        qrStylingInstance.download({
            name: `QR_Code_${Date.now()}`,
            extension: format
        });
    });
}

export async function renderWorkspace(container, files, utils) {
    container.innerHTML = `
        <div class="qr-preview-wrapper">
            <div class="qr-canvas-holder" id="qr-canvas-display"></div>
            <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; max-width: 320px;">
                Your custom QR code updates in real-time. Use the options panel on the right to shape it, color it, and download.
            </p>
        </div>
    `;

    // Delay briefly to allow elements to mount
    setTimeout(() => {
        updateQRCode();
    }, 100);
}

function updateQRCode() {
    const displayContainer = document.getElementById('qr-canvas-display');
    if (!displayContainer) return;

    // Read inputs
    const textData = document.getElementById('qr-data').value || 'Everyday Tools';
    const dotType = document.getElementById('qr-dot-type').value || 'square';
    const cornerType = document.getElementById('qr-corner-type').value || 'square';
    const colorMode = document.getElementById('qr-color-type').value || 'solid';
    const fgColor = document.getElementById('qr-color-fg').value || '#6366f1';
    const bgColor = document.getElementById('qr-color-bg').value || '#ffffff';
    
    // Gradient settings
    const gradStart = document.getElementById('qr-grad-start').value || '#6366f1';
    const gradEnd = document.getElementById('qr-grad-end').value || '#a855f7';
    const gradRotation = parseInt(document.getElementById('qr-grad-rotation').value || '45');

    // Build configuration
    const config = {
        width: 300,
        height: 300,
        type: 'canvas',
        data: textData,
        image: logoDataUrl,
        dotsOptions: {
            type: dotType
        },
        backgroundOptions: {
            color: bgColor,
        },
        cornersSquareOptions: {
            type: cornerType,
            color: colorMode === 'solid' ? fgColor : gradStart
        },
        cornersDotOptions: {
            type: 'square',
            color: colorMode === 'solid' ? fgColor : gradEnd
        },
        imageOptions: {
            crossOrigin: 'anonymous',
            margin: 4,
            imageSize: 0.4
        }
    };

    // Apply colors or gradient
    if (colorMode === 'gradient') {
        config.dotsOptions.gradient = {
            type: 'linear',
            rotation: (gradRotation * Math.PI) / 180,
            colorStops: [
                { offset: 0, color: gradStart },
                { offset: 1, color: gradEnd }
            ]
        };
    } else {
        config.dotsOptions.color = fgColor;
    }

    displayContainer.innerHTML = '';
    
    try {
        // Construct and render QRCodeStyling
        qrStylingInstance = new QRCodeStyling(config);
        qrStylingInstance.append(displayContainer);
    } catch (err) {
        console.error('Error generating QR Code styling:', err);
        displayContainer.innerHTML = '<span style="color:var(--error)">Error creating QR Code</span>';
    }
}
