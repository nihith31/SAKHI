# Test Ollama Cloud Connection for Sakhi
# Run this to verify your OLLAMA_HOST, OLLAMA_API_KEY, and AI_MODEL settings are correct.

Write-Host "[ Sakhi ] Testing Ollama Cloud Connection..." -ForegroundColor Cyan

# Load .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "        Please copy .env.example to .env and fill in your credentials." -ForegroundColor Yellow
    Exit 1
}

# Parse .env values
$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match "^\s*[^#]\S+=.+" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $envVars[$parts[0].Trim()] = $parts[1].Trim()
}

$ollamaHost = $envVars["OLLAMA_HOST"]
$ollamaApiKey = $envVars["OLLAMA_API_KEY"]
$aiModel = $envVars["AI_MODEL"]

$keySet = if ($ollamaApiKey -and $ollamaApiKey -ne "your-ollama-cloud-api-key-here") { "YES" } else { "NO (placeholder not replaced)" }

Write-Host ""
Write-Host "[ Config ]" -ForegroundColor Cyan
Write-Host "   OLLAMA_HOST : $ollamaHost"
Write-Host "   AI_MODEL    : $aiModel"
Write-Host "   API_KEY SET : $keySet"
Write-Host ""

if (-not $ollamaApiKey -or $ollamaApiKey -eq "your-ollama-cloud-api-key-here") {
    Write-Host "[WARNING] OLLAMA_API_KEY is not set or still has the placeholder value." -ForegroundColor Yellow
    Write-Host "          Please edit .env and paste your real Ollama Cloud API key." -ForegroundColor Yellow
    Exit 1
}

# Test connection to Ollama Cloud
Write-Host "[ Connecting ] Sending request to Ollama Cloud API..." -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $ollamaApiKey"
        "Content-Type"  = "application/json"
    }

    $response = Invoke-RestMethod `
        -Uri "$ollamaHost/api/tags" `
        -Method Get `
        -Headers $headers `
        -TimeoutSec 10

    Write-Host "[OK] Connected to Ollama Cloud successfully!" -ForegroundColor Green

    $models = $response.models | ForEach-Object { $_.name }
    Write-Host "     Available models: $($models -join ', ')" -ForegroundColor Gray

    if ($models -contains $aiModel -or ($models | Where-Object { $_ -like "*$aiModel*" })) {
        Write-Host "[OK] Model '$aiModel' is available and ready." -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Model '$aiModel' was not found in available models." -ForegroundColor Yellow
        Write-Host "          Check your AI_MODEL setting in .env." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to connect to Ollama Cloud." -ForegroundColor Red
    Write-Host "        Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "[ Tips ]" -ForegroundColor Yellow
    Write-Host "   - Verify OLLAMA_HOST is: https://api.ollama.com" -ForegroundColor Yellow
    Write-Host "   - Check OLLAMA_API_KEY at: https://ollama.com/settings/api-keys" -ForegroundColor Yellow
    Write-Host "   - Ensure you have internet access." -ForegroundColor Yellow
    Exit 1
}

Write-Host ""
Write-Host "[ Ready ] Sakhi can now use Ollama Cloud. Start the backend with:" -ForegroundColor Green
Write-Host "   .\venv\Scripts\uvicorn app.main:app --reload" -ForegroundColor Cyan
