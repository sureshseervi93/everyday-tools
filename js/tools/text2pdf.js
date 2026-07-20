/**
 * Tool: Text to PDF
 */

let loadedTextContent = '';

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="txt-font">Font Family</label>
            <select id="txt-font" class="form-control">
                <option value="Helvetica">Helvetica (Clean Sans-Serif)</option>
                <option value="TimesRoman">Times Roman (Classic Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="txt-size">Font Size</label>
            <select id="txt-size" class="form-control">
                <option value="10">10 pt</option>
                <option value="12" selected>12 pt</option>
                <option value="14">14 pt</option>
                <option value="16">16 pt</option>
            </select>
        </div>
        <div class="form-group">
            <label for="txt-margin">Margins</label>
            <select id="txt-margin" class="form-control">
                <option value="36">0.5 inch (36px)</option>
                <option value="54" selected>0.75 inch (54px)</option>
                <option value="72">1.0 inch (72px)</option>
            </select>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    const file = files[0];
    container.innerHTML = `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <strong>Editing:</strong> ${file.name}
            <span class="dropzone-hint" id="text-char-count">0 characters</span>
        </div>
        <textarea id="text-editor-area" class="form-control" style="height: 420px; font-family: monospace; font-size: 0.9rem; line-height: 1.5; resize: vertical; background-color: var(--bg-input); border-color: var(--border-color);"></textarea>
    `;

    const textarea = document.getElementById('text-editor-area');
    const badge = document.getElementById('text-char-count');

    const updateCharCount = () => {
        badge.textContent = `${textarea.value.length} character(s)`;
        loadedTextContent = textarea.value;
    };

    textarea.addEventListener('input', updateCharCount);

    try {
        // Read file contents as text
        const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
        
        textarea.value = text;
        updateCharCount();
    } catch (err) {
        console.error('Failed to read text file:', err);
        textarea.value = 'Failed to load file content.';
        updateCharCount();
    }
}

export async function process(files, options, progressCallback) {
    if (!loadedTextContent) throw new Error('No text content to process.');

    progressCallback(15, 'Preparing document structure...');
    const pdfDoc = await PDFLib.PDFDocument.create();

    const fontOpt = options['txt-font'] || 'Helvetica';
    const fontSize = parseInt(options['txt-size'] || '12');
    const margin = parseInt(options['txt-margin'] || '54');

    // Resolve Standard Fonts
    let font;
    if (fontOpt === 'Courier') {
        font = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
    } else if (fontOpt === 'TimesRoman') {
        font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
    } else {
        font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    }

    // Page layout settings: Standard A4 page
    const pageWidth = 595.27; // A4 Width
    const pageHeight = 841.89; // A4 Height
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const lineHeight = fontSize * 1.35;

    progressCallback(35, 'Wrapping text content...');
    
    // Split into paragraphs
    const paragraphs = loadedTextContent.split(/\r?\n/);
    const wrappedLines = [];

    paragraphs.forEach(para => {
        if (para.trim() === '') {
            wrappedLines.push(''); // Empty line for space between paragraphs
            return;
        }

        const words = para.split(' ');
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (testWidth > contentWidth) {
                wrappedLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine !== '') {
            wrappedLines.push(currentLine);
        }
    });

    progressCallback(60, 'Drawing text pages...');
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin; // Starting drawing Y coordinate

    for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i];
        
        // Check if line overflows current page bounds
        if (currentY - lineHeight < margin) {
            // Create a new page
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
            
            const pct = Math.floor(60 + (i / wrappedLines.length) * 30);
            progressCallback(pct, `Drawing text pages...`);
        }

        if (line !== '') {
            page.drawText(line, {
                x: margin,
                y: currentY - fontSize, // Position matches top of text
                size: fontSize,
                font: font,
                color: PDFLib.rgb(0.12, 0.15, 0.18) // Dark Slate Gray text
            });
        }
        
        currentY -= lineHeight;
    }

    progressCallback(92, 'Generating PDF...');
    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `Document_${Date.now()}.pdf`;

    progressCallback(100, 'Conversion Complete!');
    return { blob, filename };
}
