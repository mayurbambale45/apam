Set-Location "D:\PROJECTS\APAM"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  APAM GitHub Push Script" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "[1/8] Checking current git status..." -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "[2/8] Checking remote URL..." -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "[3/8] Fetching latest from remote..." -ForegroundColor Yellow
git fetch origin 2>&1
Write-Host ""

Write-Host "[4/8] Checking local vs remote commits..." -ForegroundColor Yellow
Write-Host "--- Local commits ---"
git log --oneline -5
Write-Host "--- Remote commits ---"
git log --oneline origin/main -5
Write-Host ""

Write-Host "[5/8] Setting git user config..." -ForegroundColor Yellow
git config user.email "mayurbambale45@gmail.com"
git config user.name "mayurbambale45"
Write-Host ""

Write-Host "[6/8] Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host ""

Write-Host "[7/8] Committing changes (if any)..." -ForegroundColor Yellow
$commitResult = git commit -m "feat: add AI evaluation pipeline, notifications, exam management, and instructor features" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "No new changes to commit or already committed." -ForegroundColor Gray
} else {
    Write-Host "Committed successfully!" -ForegroundColor Green
    Write-Host $commitResult
}
Write-Host ""

Write-Host "[8/8] Pulling remote and pushing..." -ForegroundColor Yellow
# Try to pull with rebase first
$pullResult = git pull origin main --rebase --allow-unrelated-histories 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rebase conflict detected. Resolving by keeping local changes..." -ForegroundColor Red
    # Get conflicted files
    $conflictedFiles = git diff --name-only --diff-filter=U
    Write-Host "Conflicted files: $conflictedFiles"
    
    # Accept our version for all conflicts
    git checkout --ours .
    git add -A
    git rebase --continue --no-edit 2>&1
}

Write-Host "[9/9] Pushing to GitHub..." -ForegroundColor Yellow
$pushResult = git push origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Normal push failed. Trying force-with-lease..." -ForegroundColor Red
    git push --force-with-lease origin main 2>&1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Done! Check output above for errors." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
