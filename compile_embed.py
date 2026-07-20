import os
import re

def compile_google_sites_embed():
    base_dir = "."
    html_path = os.path.join(base_dir, "index.html")
    css_path = os.path.join(base_dir, "css", "style.css")
    utils_path = os.path.join(base_dir, "js", "utils.js")
    app_path = os.path.join(base_dir, "js", "app.js")
    tools_dir = os.path.join(base_dir, "js", "tools")

    print("Reading source files...")
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()

    with open(utils_path, "r", encoding="utf-8") as f:
        utils_content = f.read()

    with open(app_path, "r", encoding="utf-8") as f:
        app_content = f.read()

    # Step 1: Inline Style sheet
    print("Inlining style.css...")
    css_pattern = '<link rel="stylesheet" href="css/style.css">'
    html_content = html_content.replace(css_pattern, f"<style>\n{css_content}\n</style>")

    # Step 2: Build the standalone script blocks
    # We will build a single <script> block at the end of the file containing:
    # 1. Utils module exposed globally as window.utils
    # 2. Tool modules registered in window.TOOL_MODULES
    # 3. Main app logic modified to read from window.TOOL_MODULES instead of import()

    print("Bundling Javascript...")
    js_bundle = []

    # 2.1 Add global script setup
    js_bundle.append("""
// Global registry for in-memory tools
window.TOOL_MODULES = {};
""")

    # 2.2 Bundle utils.js
    # Strip exports
    clean_utils = re.sub(r'export\s+', '', utils_content)
    js_bundle.append(f"""
// ==========================================
// UTILS MODULE
// ==========================================
window.utils = (function() {{
    const utils_exports = {{}};
    {clean_utils}
    
    // Bind exports
    utils_exports.readFileAsArrayBuffer = readFileAsArrayBuffer;
    utils_exports.readFileAsText = readFileAsText;
    utils_exports.readFileAsDataURL = readFileAsDataURL;
    utils_exports.formatBytes = formatBytes;
    return utils_exports;
}})();
""")

    # 2.3 Bundle all tools in js/tools
    print("Inlining all 17 tool files...")
    for filename in sorted(os.listdir(tools_dir)):
        if not filename.endswith(".js"):
            continue
        tool_id = filename.split(".js")[0]
        tool_path = os.path.join(tools_dir, filename)

        with open(tool_path, "r", encoding="utf-8") as f:
            tool_content = f.read()

        # Remove import lines
        tool_content = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?', '', tool_content)
        # Expose utils functions globally in the tool scope
        tool_content = """
        const { readFileAsArrayBuffer, readFileAsText, readFileAsDataURL, formatBytes } = window.utils;
        """ + tool_content

        # Strip export statements
        tool_content = re.sub(r'export\s+function\s+', 'function ', tool_content)
        tool_content = re.sub(r'export\s+async\s+function\s+', 'async function ', tool_content)

        js_bundle.append(f"""
// ==========================================
// TOOL MODULE: {tool_id}
// ==========================================
window.TOOL_MODULES['{tool_id}'] = (function() {{
    {tool_content}
    
    return {{
        renderOptions: typeof renderOptions !== 'undefined' ? renderOptions : null,
        renderWorkspace: typeof renderWorkspace !== 'undefined' ? renderWorkspace : null,
        process: typeof process !== 'undefined' ? process : null
    }};
}})();
""")

    # 2.4 Modify app.js to use in-memory TOOL_MODULES
    clean_app = app_content
    # Remove import statement at the top of app.js
    clean_app = re.sub(r'import\s+.*?from\s+[\'"].*?[\'"];?', '', clean_app)
    
    # Locate activeToolModule = await import(modulePath) and change it to load from window.TOOL_MODULES
    import_pattern = r'const\s+modulePath\s+=\s+`\./tools/\$\{tool\.id\}\.js`;\s*activeToolModule\s*=\s*await\s*import\(modulePath\);'
    replacement = "activeToolModule = window.TOOL_MODULES[tool.id];"
    clean_app = re.sub(import_pattern, replacement, clean_app)

    # Replace any direct formatBytes call or utils call if they aren't bound
    clean_app = """
    const { formatBytes } = window.utils;
    """ + clean_app

    js_bundle.append(f"""
// ==========================================
// MAIN APP WORKSPACE
// ==========================================
(function() {{
    {clean_app}
}})();
""")

    # Combined script tag
    final_script = "<script>\n" + "\n".join(js_bundle) + "\n</script>"

    # Step 3: Replace module script tags in HTML with our compiled bundle
    print("Assembling final HTML page...")
    script_pattern = r'<script\s+type="module"\s+src="js/utils.js"></script>\s*<script\s+type="module"\s+src="js/app.js"></script>'
    
    match = re.search(script_pattern, html_content)
    if match:
        html_content = html_content[:match.start()] + final_script + html_content[match.end():]
    else:
        # Fallback manual string replacement
        html_content = html_content.replace('<script type="module" src="js/utils.js"></script>', '')
        html_content = html_content.replace('<script type="module" src="js/app.js"></script>', final_script)

    # Save to file
    output_path = os.path.join(base_dir, "google_sites_embed.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Success! Standalone Google Sites embed file created: {output_path}")

if __name__ == "__main__":
    compile_google_sites_embed()
