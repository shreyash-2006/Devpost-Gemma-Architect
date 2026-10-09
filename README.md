# 🎃 Devpost Gemma Architect

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://hacktoberfest.com)
[![Google Gemma AI](https://img.shields.io/badge/Google-Gemma_AI-blue.svg)](https://ai.google.dev/gemma)
[![Node.js](https://img.shields.io/badge/Node.js-v25.5.0-green.svg)](https://nodejs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-purple.svg)](LICENSE)

An intelligent, AI-powered tool that analyzes your project codebase and automatically generates a properly structured, compelling **Devpost Submission** for **Hacktoberfest** and hackathons using **Google Gemma models** (`gemma-2-27b-it`, `gemma-2-9b-it`, `gemma3:4b`, or local Ollama).

---

## 🚀 Key Features

- **🔍 Automated Codebase Analysis**: Scans project directories or drag-and-dropped files, detecting lines of code (LOC), language stats breakdown, dependencies (`package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`), and key code entrypoint snippets.
- **🤖 Powered by Google Gemma AI**: Engineered prompt pipeline specifically tailored for Devpost's submission format (Inspiration, What it does, How we built it, Challenges, Accomplishments, Learnings, Roadmap, and Built With tags).
- **🦙 Multi-Provider Support**:
  - **Google AI Studio API**: `gemma-2-27b-it` & `gemma-2-9b-it`
  - **Local Ollama**: `gemma3:4b`, `gemma3:12b`, `gemma3:1b`, or `gemma2`
  - **Groq API**: `gemma2-9b-it`
  - **OpenRouter**: `google/gemma-2-27b-it`
- **🖥️ Dynamic Glassmorphic Web App**: Includes side-by-side Devpost preview, live section editor, section-by-section Gemma refinement modal, 1-click clipboard copy, and `.md` export.
- **⚡ 1-Click PowerShell Launcher**: Launch server & browser automatically with `start.ps1`.
- **💻 Command Line Interface (CLI)**: Automate Devpost post generation directly from terminal.

---

## 📦 Project Structure

```
Devpost-Gemma-Architect/
├── public/
│   ├── index.html       # Web App UI (4-step wizard)
│   ├── css/style.css    # Dark glassmorphism styling
│   └── js/app.js        # Frontend app logic & API handler
├── src/
│   ├── analyzer.js      # Codebase scanner & metadata extractor
│   ├── gemma.js         # Unified Gemma AI provider integration
│   ├── templates.js     # Devpost prompt specs & section builder
│   ├── server.js        # Express REST API backend
│   └── cli.js           # Command-line interface
├── start.ps1            # 1-Click PowerShell Launcher
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### Option A: 1-Click PowerShell Launcher (Windows)

Right-click **`start.ps1`** and select **Run with PowerShell**, or run in terminal:

```powershell
.\start.ps1
```

This script automatically:
1. Verifies Node.js & NPM dependencies.
2. Checks local Ollama status & installed Gemma models.
3. Launches the web server on `http://localhost:3000`.
4. Opens your default browser automatically.

---

### Option B: Manual Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Web Server**:
   ```bash
   npm start
   ```
   Open **`http://localhost:3000`** in your browser.

---

## 💻 CLI Mode Usage

You can also run the tool directly from terminal on any local project repository:

```bash
# Basic scan and generate DEVPOST.md
node src/cli.js --path ./ --title "My Awesome Hackathon Project"

# Specify provider & API key
node src/cli.js --path ./ --provider google --key YOUR_GEMMA_KEY --output DEVPOST.md

# Specify tone (hacktober | technical | enthusiastic | concise)
node src/cli.js --path ./ --tone hacktober --context "Built in 48 hrs for Hacktoberfest using Gemma AI"
```

---

## 📝 Generated Devpost Sections

| Devpost Field | Generated Content |
| :--- | :--- |
| **Elevator Pitch / Tagline** | Catchy 1-sentence headline (Max 140 chars) |
| **Inspiration** | Why you built it & real-world problem statement |
| **What it does** | Detailed feature breakdown & user workflow |
| **How we built it** | Technical architecture, languages, frameworks & Gemma AI usage |
| **Challenges we ran into** | Technical hurdles faced & how you solved them |
| **Accomplishments** | Key highlights, performance wins & UI quality |
| **What we learned** | Insights gained about Gemma AI, architecture & open source |
| **What's next** | Future roadmap & Hacktoberfest open source contribution goals |
| **Built With Tags** | Comma-separated tech tags for Devpost tag field |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/shreyash-2006/Devpost-Gemma-Architect/issues).

---

## 📜 License

Distributed under the ISC License. See `LICENSE` for more information.
