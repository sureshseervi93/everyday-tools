import os
import re

TOOLS = [
    { 'id': 'merge', 'name': 'Merge PDF', 'desc': 'Combine multiple PDF files into one in any order you choose.' },
    { 'id': 'split', 'name': 'Split PDF', 'desc': 'Extract specific pages or split pages into individual files.' },
    { 'id': 'organize', 'name': 'Organize Pages', 'desc': 'Visual drag-and-drop interface to reorder or delete PDF pages.' },
    { 'id': 'rotate', 'name': 'Rotate PDF', 'desc': 'Rotate pages of your PDF document and save them.' },
    { 'id': 'pdf2img', 'name': 'PDF to Images', 'desc': 'Convert PDF pages into high-quality JPG or PNG images.' },
    { 'id': 'img2pdf', 'name': 'Images to PDF', 'desc': 'Convert PNG, JPG, WEBP or HEIC images into a PDF document.' },
    { 'id': 'text2pdf', 'name': 'Text to PDF', 'desc': 'Convert markdown or formatted text documents into a clean PDF.' },
    { 'id': 'compress', 'name': 'Compress PDF', 'desc': 'Reduce PDF file size while keeping optimal visual quality.' },
    { 'id': 'protect', 'name': 'Protect PDF', 'desc': 'Encrypt your PDF document with a strong password.' },
    { 'id': 'unlock', 'name': 'Unlock PDF', 'desc': 'Remove password security from your PDF (if password is known).' },
    { 'id': 'watermark', 'name': 'Add Watermark', 'desc': 'Overlay customizable text or images onto pages of your PDF.' },
    { 'id': 'pagenumber', 'name': 'Page Numbers', 'desc': 'Add page numbers to your PDF with placement controls.' },
    { 'id': 'sign', 'name': 'Sign PDF', 'desc': 'Draw or upload a signature and visually place it on your document.' },
    { 'id': 'mp3crop', 'name': 'MP3 Cropper', 'desc': 'Visually trim audio files client-side and download as MP3.' },
    { 'id': 'mp4tomp3', 'name': 'MP4 to MP3', 'desc': 'Extract audio track from MP4 video and convert it to MP3.' },
    { 'id': 'calculator', 'name': 'Smart Calculator', 'desc': 'A sleek Standard, Scientific, Mortgage, and BMI Calculator.' },
    { 'id': 'qrcode', 'name': 'QR Code Creator', 'desc': 'Create customized QR codes with shapes, colors, and custom logo overlays.' }
]

def compile_wix_embeds():
    base_dir = "."
    output_dir = os.path.join(base_dir, "wix_embeds")
    os.makedirs(output_dir, exist_ok=True)

    # Read base stylesheets and script assets
    with open(os.path.join(base_dir, "css", "style.css"), "r", encoding="utf-8") as f:
        css_content = f.read()

    with open(os.path.join(base_dir, "js", "utils.js"), "r", encoding="utf-8") as f:
        utils_content = f.read()

    clean_utils = re.sub(r'export\s+', '', utils_content)

    print("Generating Wix-optimized embeds...")

    # 1. Compile Wix Master All-in-One App
    with open(os.path.join(base_dir, "google_sites_embed.html"), "r", encoding="utf-8") as f:
        master_content = f.read()

    # Add Wix responsiveness styling to master content
    wix_custom_css = """
    <style>
        body {
            background-color: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .app-container {
            min-height: 100vh;
        }
    </style>
    """
    wix_master = master_content.replace("</head>", f"{wix_custom_css}\n</head>")
    with open(os.path.join(output_dir, "wix_master_app.html"), "w", encoding="utf-8") as f:
        f.write(wix_master)
    print(" - Created wix_master_app.html")

    # 2. Compile Individual Wix Tool Widgets
    for tool in TOOLS:
        tool_id = tool['id']
        tool_js_path = os.path.join(base_dir, "js", "tools", f"{tool_id}.js")
        with open(tool_js_path, "r", encoding="utf-8") as f:
            tool_js = f.read()

        tool_js = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?', '', tool_js)
        tool_js = re.sub(r'export\s+function\s+', 'function ', tool_js)
        tool_js = re.sub(r'export\s+async\s+function\s+', 'async function ', tool_js)

        widget_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{tool['name']} - Wix Embed</title>
    
    <!-- HTTPS CDNs for Wix Security -->
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.5.0-rc.1/lib/qr-code-styling.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        /* Wix iframe seamless layout overrides */
        html, body {{
            background: transparent;
            margin: 0;
            padding: 8px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #2d3748;
            overflow-x: hidden;
        }}
        
        {css_content}

        .workspace-container {{
            max-width: 100%;
            margin: 0;
        }}
        
        .main-content {{
            padding: 0;
            min-height: auto;
        }}
    </style>
</head>
<body data-theme="light">
    
    <div id="toast-container" class="toast-container"></div>
    
    <div class="workspace-container">
        <div class="workspace-header" style="border:none; padding-bottom:12px; margin-bottom:12px;">
            <h2 id="workspace-title" style="margin:0;font-size:1.4rem;">{tool['name']}</h2>
            <p id="workspace-description" style="margin:4px 0 0;font-size:0.85rem;color:var(--text-muted);">{tool['desc']}</p>
        </div>

        <div class="editor-layout" style="display:flex; flex-direction:row; gap:20px; flex-wrap:wrap;">
            
            <div style="flex:1; min-width:300px;">
                <div class="dropzone" id="tool-dropzone" style="height:240px;">
                    <input type="file" id="file-input" style="display: none;">
                    <div class="dropzone-content">
                        <div class="dropzone-icon" style="background: linear-gradient(135deg, var(--primary), var(--secondary)); color:white; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: 0 auto 12px;">
                            <i data-lucide="upload-cloud"></i>
                        </div>
                        <h3>Drag & drop files here</h3>
                        <p>or click to browse from device</p>
                        <span class="dropzone-hint" style="font-size:0.75rem; color:var(--text-muted);">Supports files</span>
                    </div>
                </div>

                <div class="editor-workspace hidden" id="editor-workspace">
                    <div class="editor-main" id="editor-main-area" style="background:var(--bg-sidebar); border:1px solid var(--border-color); border-radius:12px; min-height:240px; padding:16px;">
                        <!-- Injected by JS -->
                    </div>
                </div>

                <div class="processing-state hidden" id="processing-state" style="text-align:center; padding:40px 20px;">
                    <div class="spinner" style="margin:0 auto 16px;"></div>
                    <p id="processing-text">Processing files client-side...</p>
                    <div class="progress-bar" style="max-width:300px; margin:12px auto 0; height:6px; background:var(--border-color); border-radius:3px; overflow:hidden;">
                        <div class="progress-fill" id="processing-progress" style="width:10%; height:100%; background:var(--primary); transition: width 0.2s ease;"></div>
                    </div>
                </div>

                <div class="success-state hidden" id="success-state" style="text-align:center; padding:40px 20px;">
                    <div class="success-icon" style="color:var(--success); font-size:2.5rem; margin-bottom:12px;">
                        <i data-lucide="check-circle" style="width:48px; height:48px;"></i>
                    </div>
                    <h3 style="margin:0 0 8px;">Success!</h3>
                    <p id="success-message" style="margin-bottom:20px; font-size:0.9rem; color:var(--text-muted);">Your file is ready.</p>
                    <div style="display:flex; justify-content:center; gap:10px;">
                        <button class="btn-primary" id="btn-download-result" style="padding:10px 20px;">
                            <i data-lucide="download"></i> Download File
                        </button>
                        <button class="btn-secondary" id="btn-reset-tool" style="padding:10px 20px;">
                            Reset Tool
                        </button>
                    </div>
                </div>
            </div>

            <div id="options-sidebar-container" style="width:260px; flex-shrink:0;">
                <div class="editor-sidebar" style="height:auto; border:1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-sidebar);">
                    <h3 style="margin-top:0; font-size:0.95rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:16px;">Options</h3>
                    
                    <div id="dynamic-options-panel"></div>
                    
                    <button class="btn-primary btn-block mt-4" id="btn-process-files">
                        Process Files
                    </button>
                </div>
            </div>

        </div>
    </div>

    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        window.utils = (function() {{
            const utils_exports = {{}};
            {clean_utils}
            utils_exports.readFileAsArrayBuffer = readFileAsArrayBuffer;
            utils_exports.readFileAsText = readFileAsText;
            utils_exports.readFileAsDataURL = readFileAsDataURL;
            utils_exports.formatBytes = formatBytes;
            return utils_exports;
        }})();

        const {{ formatBytes }} = window.utils;

        window.activeToolModule = (function() {{
            const {{ readFileAsArrayBuffer, readFileAsText, readFileAsDataURL, formatBytes }} = window.utils;
            {tool_js}
            return {{
                renderOptions: typeof renderOptions !== 'undefined' ? renderOptions : null,
                renderWorkspace: typeof renderWorkspace !== 'undefined' ? renderWorkspace : null,
                process: typeof process !== 'undefined' ? process : null
            }};
        }})();

        (function() {{
            const toolId = '{tool_id}';
            const noFileTools = ['calculator', 'qrcode'];
            let currentFiles = [];
            let processedResultBlob = null;
            let processedResultFilename = '';

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

            window.addEventListener('DOMContentLoaded', async () => {{
                if (window.activeToolModule.renderOptions) {{
                    window.activeToolModule.renderOptions(dynamicOptionsPanel);
                }}

                if (noFileTools.includes(toolId)) {{
                    toolDropzone.classList.add('hidden');
                    editorWorkspace.classList.remove('hidden');
                    document.getElementById('options-sidebar-container').style.display = 'block';
                    if (btnProcessFiles) btnProcessFiles.classList.add('hidden');

                    if (window.activeToolModule.renderWorkspace) {{
                        editorMainArea.innerHTML = '';
                        await window.activeToolModule.renderWorkspace(editorMainArea, [], {{ formatBytes }});
                    }}
                }} else {{
                    if (btnProcessFiles) btnProcessFiles.classList.remove('hidden');
                    initUploadEvents();
                    initProcessEvents();
                }}

                lucide.createIcons();
            }});

            function initUploadEvents() {{
                toolDropzone.addEventListener('click', () => fileInput.click());
                toolDropzone.addEventListener('dragover', (e) => {{
                    e.preventDefault();
                    toolDropzone.classList.add('dragover');
                }});
                toolDropzone.addEventListener('dragleave', () => toolDropzone.classList.remove('dragover'));
                toolDropzone.addEventListener('drop', (e) => {{
                    e.preventDefault();
                    toolDropzone.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
                }});
                fileInput.addEventListener('change', (e) => {{
                    if (e.target.files.length > 0) handleFileUpload(e.target.files);
                }});

                if (toolId === 'img2pdf') {{
                    fileInput.accept = 'image/png, image/jpeg, image/webp, image/heic';
                    toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PNG, JPG, WEBP, HEIC';
                }} else if (toolId === 'text2pdf') {{
                    fileInput.accept = '.txt, .md';
                    toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports TXT, MD text files';
                }} else if (toolId === 'mp3crop') {{
                    fileInput.accept = '.mp3, .wav';
                    toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports MP3, WAV audio files';
                }} else if (toolId === 'mp4tomp3') {{
                    fileInput.accept = '.mp4, .webm, .mov, .avi';
                    toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports MP4, WebM, MOV, AVI video files';
                }} else {{
                    fileInput.accept = '.pdf';
                    toolDropzone.querySelector('.dropzone-hint').textContent = 'Supports PDF documents';
                }}
            }}

            async function handleFileUpload(filesList) {{
                const filesArray = Array.from(filesList);
                if (toolId !== 'img2pdf' && toolId !== 'merge' && filesArray.length > 1) {{
                    showToast('This tool only supports single-file inputs.', 'warning');
                    currentFiles = [filesArray[0]];
                }} else {{
                    currentFiles = filesArray;
                }}

                toolDropzone.classList.add('hidden');
                editorWorkspace.classList.remove('hidden');
                editorMainArea.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:200px;"><div class="spinner"></div></div>';

                try {{
                    if (window.activeToolModule.renderWorkspace) {{
                        await window.activeToolModule.renderWorkspace(editorMainArea, currentFiles, {{ formatBytes }});
                    }}
                }} catch(err) {{
                    console.error(err);
                    showToast('Error rendering workspace preview.', 'error');
                }}
                lucide.createIcons();
            }}

            function initProcessEvents() {{
                btnProcessFiles.addEventListener('click', async () => {{
                    if (currentFiles.length === 0) {{
                        showToast('Please upload files to process.', 'warning');
                        return;
                    }}

                    const options = {{}};
                    dynamicOptionsPanel.querySelectorAll('input, select, textarea').forEach(el => {{
                        if (el.type === 'checkbox') {{
                            options[el.id] = el.checked;
                        }} else {{
                            options[el.id] = el.value;
                        }}
                    }});

                    editorWorkspace.classList.add('hidden');
                    processingState.classList.remove('hidden');
                    processingText.textContent = 'Processing files...';
                    processingProgress.style.width = '10%';

                    try {{
                        const result = await window.activeToolModule.process(currentFiles, options, (pct, statusText) => {{
                            processingProgress.style.width = pct + '%';
                            if (statusText) processingText.textContent = statusText;
                        }});

                        processedResultBlob = result.blob;
                        processedResultFilename = result.filename;

                        processingState.classList.add('hidden');
                        successState.classList.remove('hidden');
                        successMessage.innerHTML = `<strong>Process Completed!</strong><br>File "${{processedResultFilename}}" (${{formatBytes(processedResultBlob.size)}}) is ready.`;
                        showToast('Success!', 'success');
                    }} catch (err) {{
                        console.error(err);
                        showToast(err.message || 'Processing failed.', 'error');
                        processingState.classList.add('hidden');
                        editorWorkspace.classList.remove('hidden');
                    }}
                }});

                btnDownloadResult.addEventListener('click', () => {{
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
                }});

                btnResetTool.addEventListener('click', () => {{
                    processedResultBlob = null;
                    processedResultFilename = '';
                    currentFiles = [];
                    toolDropzone.classList.remove('hidden');
                    editorWorkspace.classList.add('hidden');
                    processingState.classList.add('hidden');
                    successState.classList.add('hidden');
                    fileInput.value = '';
                }});
            }}

            function showToast(message, type = 'info') {{
                const toast = document.createElement('div');
                toast.className = 'toast ' + type;
                let icon = 'info';
                if (type === 'success') icon = 'check-circle';
                if (type === 'error') icon = 'alert-triangle';
                if (type === 'warning') icon = 'alert-circle';

                toast.innerHTML = `<i data-lucide="${{icon}}"></i><div class="toast-content">${{message}}</div>`;
                toastContainer.appendChild(toast);
                lucide.createIcons();

                setTimeout(() => {{
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateY(20px)';
                    setTimeout(() => {{
                        if (toastContainer.contains(toast)) toastContainer.removeChild(toast);
                    }}, 300);
                }}, 4000);
            }}
        }})();
    </script>
</body>
</html>
"""
        output_filename = os.path.join(output_dir, f"{tool_id}_wix.html")
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write(widget_html)
        print(f" - Created {tool_id}_wix.html")

    print(f"Success! All Wix embeds compiled to {output_dir}")

if __name__ == "__main__":
    compile_wix_embeds()
