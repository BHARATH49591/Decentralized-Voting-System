# Decentralized Voting System Launcher

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   DECENTRALIZED VOTING SYSTEM LAUNCHER       " -ForegroundColor White -BackgroundColor Blue
Write-Host "===============================================" -ForegroundColor Cyan

$ROOT_DIR = Get-Location

# 1. Clean Build
Write-Host "`n[1/5] Cleaning old builds..." -ForegroundColor Yellow
if (Test-Path "$ROOT_DIR\build") {
    Remove-Item -Recurse -Force "$ROOT_DIR\build"
    Write-Host "Build folder removed." -ForegroundColor Green
}

# 2. Check Ganache
Write-Host "`n[2/5] Checking Ganache..." -ForegroundColor Yellow
$ganacheRunning = Get-Process | Where-Object { $_.ProcessName -like "*Ganache*" }
if (-not $ganacheRunning) {
    Write-Host "WARNING: Ganache GUI does not seem to be running." -ForegroundColor Red
    Write-Host "Please start Ganache GUI or press any key to continue if you are using Ganache CLI..." -ForegroundColor Gray
    # Pause for a bit
    Start-Sleep -Seconds 2
} else {
    Write-Host "Ganache detected." -ForegroundColor Green
}

# 3. Truffle Migrate
Write-Host "`n[3/5] Migrating Smart Contracts..." -ForegroundColor Yellow
truffle migrate --reset
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Truffle migration failed. Make sure Ganache is running on port 7545." -ForegroundColor Red
    return
}

# 4. Browserify Bundling
Write-Host "`n[4/5] Bundling JavaScript files..." -ForegroundColor Yellow
npx browserify ./src/js/app.js -o ./src/dist/app.bundle.js
npx browserify ./src/js/login.js -o ./src/dist/login.bundle.js
npx browserify ./src/js/register.js -o ./src/dist/register.bundle.js
npx browserify ./src/js/audit.js -o ./src/dist/audit.bundle.js
npx browserify ./src/js/verify.js -o ./src/dist/verify.bundle.js

# 5. Start Servers
Write-Host "`n[5/5] Launching Servers..." -ForegroundColor Yellow

# Start Python Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\Database_API'; python -m uvicorn main:app --reload" -Title "VOTING-BACKEND (FastAPI)"

# Start Node.js Frontend Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR'; node index.js" -Title "VOTING-FRONTEND (Express)"

Write-Host "`nSUCCESS: All components are starting up!" -ForegroundColor Green
Write-Host "Opening Login Page in 3 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Open Browser
Start-Process "http://localhost:8080"

Write-Host "`nDone! You can close this window now." -ForegroundColor Cyan
