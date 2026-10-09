# ==============================================================================
# Devpost Gemma Architect - Single PowerShell Launcher
# Hacktoberfest Devpost Submission Generator powered by Gemma AI
# ==============================================================================

$Host.UI.RawUI.WindowTitle = "Devpost Gemma Architect - Server Launcher"
Clear-Host

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " DEVPOST GEMMA ARCHITECT (HACKTOBERFEST EDITION)" -ForegroundColor Magenta
Write-Host " Codebase Analysis & Devpost Submission Generator using Gemma AI" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$WorkspaceDir = $PSScriptRoot
Set-Location -Path $WorkspaceDir

# 1. Check Node.js installation
Write-Host "[1/4] Checking Node.js environment..." -ForegroundColor DarkCyan
try {
    $nodeVersion = node -v 2>$null
    if ($nodeVersion) {
        Write-Host "  [+] Node.js detected: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  [-] Node.js is not installed or not in PATH. Please install Node.js." -ForegroundColor Red
        Pause
        Exit 1
    }
} catch {
    Write-Host "  [-] Failed executing Node.js check." -ForegroundColor Red
    Pause
    Exit 1
}

# 2. Check node_modules dependencies
Write-Host "[2/4] Checking NPM dependencies..." -ForegroundColor DarkCyan
if (-not (Test-Path "$WorkspaceDir\node_modules")) {
    Write-Host "  [*] node_modules missing. Installing npm packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [-] Failed installing npm packages." -ForegroundColor Red
        Pause
        Exit 1
    }
} else {
    Write-Host "  [+] Dependencies installed." -ForegroundColor Green
}

# 3. Check Ollama Status & Local Gemma Models
Write-Host "[3/4] Checking Local Ollama AI Service..." -ForegroundColor DarkCyan
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($ollamaCheck -and $ollamaCheck.models) {
        $modelList = $ollamaCheck.models | ForEach-Object { $_.name }
        $joinedModels = $modelList -join ", "
        Write-Host "  [+] Ollama is running locally with models: $joinedModels" -ForegroundColor Green
    } else {
        Write-Host "  [*] Local Ollama not running or no response on http://localhost:11434." -ForegroundColor Gray
        Write-Host "      (You can also use Google AI Studio GEMMA_API_KEY in the Web UI)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [*] Local Ollama endpoint offline. You can use Google AI Studio API Key in the UI." -ForegroundColor Gray
}

# 4. Launch Application Server & Open Browser
Write-Host "[4/4] Starting Devpost Gemma Architect Server..." -ForegroundColor DarkCyan
Write-Host "  [>] Access URL: http://localhost:3000" -ForegroundColor Green
Write-Host "  (Press Ctrl+C in this terminal window to stop the server)" -ForegroundColor DarkGray
Write-Host ""

# Start default web browser after 2 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
} | Out-Null

# Run Node Express server
node src/server.js
