# Installs repo git hooks (auto-push after commit).
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $PSScriptRoot "hooks\post-commit"
$dest = Join-Path $root ".git\hooks\post-commit"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Error "Not a git repository: $root"
  exit 1
}

Copy-Item -Force $src $dest
Write-Host "Installed post-commit hook -> $dest"
Write-Host "Every git commit will auto-push to origin (and demo if configured)."
