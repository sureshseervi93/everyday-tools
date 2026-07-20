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

def generate_pages():
    template_path = "index.html"
    if not os.path.exists(template_path):
        print(f"Error: {template_path} does not exist!")
        return

    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    print("Generating standalone tool pages...")
    for tool in TOOLS:
        page_content = template_content

        # 1. Update Title tag
        title_pattern = r'<title>.*?</title>'
        page_content = re.sub(title_pattern, f"<title>{tool['name']} - Everyday Tools</title>", page_content)

        # 2. Add data-tool-id to body
        page_content = page_content.replace("<body>", f'<body data-tool-id="{tool["id"]}">')

        # 3. Remove Dashboard view section
        # Finds the block from <!-- DASHBOARD VIEW --> to the end of dashboard </section>
        dash_pattern = r'<!--\s*DASHBOARD VIEW\s*-->.*?<section id="view-dashboard".*?</section>'
        page_content = re.sub(dash_pattern, '', page_content, flags=re.DOTALL)

        # 4. Make Workspace active and prefill header labels
        page_content = page_content.replace(
            '<section id="view-tool-workspace" class="view-panel hidden">',
            '<section id="view-tool-workspace" class="view-panel active">'
        )
        page_content = page_content.replace(
            '<h2 id="workspace-title">Tool Name</h2>',
            f'<h2 id="workspace-title">{tool["name"]}</h2>'
        )
        page_content = page_content.replace(
            '<p id="workspace-description">Tool Description</p>',
            f'<p id="workspace-description">{tool["desc"]}</p>'
        )

        # 5. Remove dashboard navigation highlights in sidebar
        page_content = page_content.replace(
            'class="nav-item active" data-target="dashboard"',
            'class="nav-item" data-target="dashboard"'
        )

        # 6. Replace index dashboard controller with the standalone controller
        page_content = page_content.replace(
            '<script type="module" src="js/app.js"></script>',
            '<script type="module" src="js/tool_page.js"></script>'
        )

        # Save HTML
        output_filename = f"{tool['id']}.html"
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write(page_content)
        print(f" - Created {output_filename}")

    print("Done! All standalone pages successfully created.")

if __name__ == "__main__":
    generate_pages()
