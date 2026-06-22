$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $projectRoot

if (-not (Test-Path ".git")) {
    exit 0
}

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-sync: $timestamp"
    git push origin HEAD
}

exit 0
