# build_and_deploy.ps1
# Automates the EAS build trigger, retrieves download link, downloads the APK,
# replaces website/assets/sakhi.apk, and commits the change.

Write-Host "1. Starting EAS Build for Android..." -ForegroundColor Cyan
cd mobile
npx eas-cli build -p android --profile preview

Write-Host "2. Fetching the download link for the completed build..." -ForegroundColor Cyan
$buildList = npx eas-cli build:list --limit=1 --json | ConvertFrom-Json
$downloadUrl = $buildList[0].artifacts.applicationArchiveUrl

if (-not $downloadUrl) {
    Write-Error "Failed to retrieve the APK download URL."
    exit 1
}

Write-Host "3. Downloading APK and saving to website/assets/sakhi.apk..." -ForegroundColor Cyan
$targetPath = "../website/assets/sakhi.apk"
Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath

Write-Host "4. APK updated successfully!" -ForegroundColor Green

Write-Host "5. Staging and committing..." -ForegroundColor Cyan
cd ..
git add website/assets/sakhi.apk
git commit -m "deploy: auto-update compiled Android APK build"

Write-Host "Build finished, downloaded, and committed! Run 'git push' to deploy to your website." -ForegroundColor Green
