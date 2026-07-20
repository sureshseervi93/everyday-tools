# GitHub Pages Hosting Guide for Everyday Tools

Since **Everyday Tools** is a 100% static, client-side application, it can be hosted for free on **GitHub Pages**. This means you get a fast, secure website with zero server maintenance costs.

Here are the two ways to host your site on GitHub:

---

## Method 1: Uploading via GitHub Web Interface (No Command Line Required)

This is the easiest method if you do not have Git installed on your computer.

1. **Create a GitHub Account**:
   - Go to [github.com](https://www.github.com) and sign up/log in.

2. **Create a New Repository**:
   - Click the **"+"** icon in the top-right corner and select **New repository**.
   - Set the repository name to `everyday-tools` (or any name you like).
   - Set the visibility to **Public** (required for free GitHub Pages).
   - Do **NOT** add a README, `.gitignore`, or license.
   - Click **Create repository**.

3. **Upload Your Files**:
   - Under the setup options, look for the link that says: **"uploading an existing file"** and click it.
   - Drag and drop all the files and folders from your local `docuforge/` folder:
     - `index.html`
     - `css/` (containing `style.css`)
     - `js/` (containing `app.js`, `utils.js`, and the `tools/` folder)
     - `run_server.bat`
   - Wait for the upload progress bars to complete.
   - Add a commit message (e.g., `Initial upload`) and click **Commit changes**.

4. **Enable GitHub Pages**:
   - Inside your repository, go to the **Settings** tab (gear icon at the top).
   - On the left sidebar, click on **Pages**.
   - Under **Build and deployment** > **Branch**, change "None" to **`main`** (or `master`), keeping `/ (root)` selected.
   - Click **Save**.

5. **Access Your Live Site**:
   - Wait 1-2 minutes. Refresh the Page settings page.
   - A box will appear at the top: *"Your site is live at `https://<username>.github.io/everyday-tools/`"*. Click the link to open it!

---

## Method 2: Uploading via Git Command Line

If you prefer to use the command line, follow these steps.

### Step 1: Install Git (If you don't have it)
Open PowerShell as Administrator and run:
```powershell
winget install --id Git.Git -e --source winget
```
*Note: Restart your terminal after installation so that the `git` command is loaded in your path.*

### Step 2: Initialize and Push to GitHub
1. Open terminal inside the `docuforge` directory.
2. Initialize local repository:
   ```bash
   git init
   ```
3. Stage all files:
   ```bash
   git add .
   ```
4. Commit the files:
   ```bash
   git commit -m "deploying Everyday Tools PDF Suite"
   ```
5. Create a new public repository on GitHub called `everyday-tools` (do not initialize with README).
6. Connect local repo to GitHub (replace `<your-username>` with your actual GitHub username):
   ```bash
   git remote add origin https://github.com/<your-username>/everyday-tools.git
   git branch -M main
   git push -u origin main
   ```
7. Go to **Settings** > **Pages** on your repository on GitHub.
8. Set the build branch source to `main` (root folder) and click **Save**.
9. Your site will be online at: `https://<your-username>.github.io/everyday-tools/`.
