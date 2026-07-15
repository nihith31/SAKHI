# build_and_deploy.ps1
# Automates the EAS build trigger, retrieves download link, downloads the APK,
# replaces website/assets/sakhi.apk, and commits the change.

Write-Host "1. Bumping version number in app.json..." -ForegroundColor Cyan
cd mobile

$appJsonPath = "app.json"
$content = Get-Content $appJsonPath -Raw
if ($content -match '"version":\s*"(\d+\.\d+\.)(\d+)"') {
    $prefix = $Matches[1]
    $patch = [int]$Matches[2] + 1
    $newVersion = "${prefix}${patch}"
    $content = $content -replace '"version":\s*"\d+\.\d+\.\d+"', "`"version`": `"$newVersion`""
    Set-Content -Path $appJsonPath -Value $content -NoNewline
    Write-Host "Bumped version to $newVersion" -ForegroundColor Green
    
    # Commit the version bump
    git add app.json
    git commit -m "chore: bump app version to $newVersion"
} else {
    Write-Host "Could not find version string in app.json" -ForegroundColor Yellow
}

Write-Host "`n2. Starting EAS Build for Android..." -ForegroundColor Cyan
npx eas-cli build -p android --profile preview

Write-Host "`n3. Fetching the download link for the completed build..." -ForegroundColor Cyan
$buildList = npx eas-cli build:list --limit=1 --json | ConvertFrom-Json
$downloadUrl = $buildList[0].artifacts.applicationArchiveUrl

if (-not $downloadUrl) {
    Write-Error "Failed to retrieve the APK download URL."
    exit 1
}

Write-Host "`n4. Downloading APK and saving to website/assets/sakhi.apk..." -ForegroundColor Cyan
$targetPath = "../website/assets/sakhi.apk"
Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath

Write-Host "`n5. APK updated successfully!" -ForegroundColor Green

Write-Host "`n6. Staging and committing APK..." -ForegroundColor Cyan
cd ..
git add website/assets/sakhi.apk
git commit -m "deploy: new Android APK build deployed (v$newVersion)"

Write-Host "Build finished, downloaded, and committed! Run 'git push' to deploy to your website." -ForegroundColor Green
