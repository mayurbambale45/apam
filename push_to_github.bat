@echo off
echo ============================================
echo   APAM GitHub Push Script
echo ============================================
echo.

cd /d "D:\PROJECTS\APAM"

echo [1/8] Checking current git status...
git status
echo.

echo [2/8] Checking remote URL...
git remote -v
echo.

echo [3/8] Fetching latest from remote...
git fetch origin
echo.

echo [4/8] Checking local vs remote commits...
git log --oneline -5
echo.
echo --- Remote commits ---
git log --oneline origin/main -5
echo.

echo [5/8] Setting git user config (if needed)...
git config user.email "mayurbambale45@gmail.com"
git config user.name "mayurbambale45"
echo.

echo [6/8] Staging all changes...
git add -A
echo.

echo [7/8] Committing changes (if any)...
git commit -m "feat: add AI evaluation pipeline, notifications, exam management, and instructor features" 2>nul
if %errorlevel% neq 0 (
    echo No new changes to commit or commit already exists.
) else (
    echo Committed successfully.
)
echo.

echo [8/8] Pulling remote changes with rebase to avoid merge conflicts...
git pull origin main --rebase --allow-unrelated-histories 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Rebase conflicts detected. Attempting to resolve...
    echo Checking conflicted files...
    git diff --name-only --diff-filter=U
    echo.
    echo Attempting auto-resolve by accepting our changes for conflicts...
    git checkout --ours .
    git add -A
    git rebase --continue --no-edit 2>&1
)
echo.

echo [9/9] Pushing to GitHub...
git push origin main 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Push failed. Attempting force push with lease (safe force push)...
    git push --force-with-lease origin main 2>&1
)

echo.
echo ============================================
echo   Done! Check output above for any errors.
echo ============================================
pause
