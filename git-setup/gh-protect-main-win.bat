@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "REPO=bell-wagtail/kikimaru_2d-game"
set "ENDPOINT=repos/%REPO%/branches/main/protection"
set "BODY=%~dp0gh-main-protection.json"

where gh >nul 2>nul
if errorlevel 1 (
  echo ERROR: GitHub CLI is not available.
  goto failed
)

if /i "%~1"=="/verify" goto verify
set "READ_ONLY="
if /i "%~1"=="/check" set "READ_ONLY=1"
if not "%~1"=="" if not defined READ_ONLY (
  echo Usage: gh-protect-main-win.bat [/check ^| /verify]
  goto failed
)
if not exist "%BODY%" (
  echo ERROR: Missing gh-main-protection.json beside this script.
  goto failed
)

set "ACTOR="
for /f "delims=" %%A in ('gh api user --jq .login 2^>nul') do set "ACTOR=%%A"
if /i not "%ACTOR%"=="bell-wagtail" (
  echo ERROR: Sign in to gh as the repository owner, bell-wagtail.
  goto failed
)

set "IS_ADMIN="
for /f "delims=" %%A in ('gh api repos/%REPO% --jq .permissions.admin 2^>nul') do set "IS_ADMIN=%%A"
if /i not "%IS_ADMIN%"=="true" (
  echo ERROR: Repository admin access could not be confirmed.
  goto failed
)

gh api repos/%REPO%/branches/main --jq .name >nul
if errorlevel 1 (
  echo ERROR: The main branch could not be confirmed.
  goto failed
)

set "PROTECTION_STATUS="
for /f "tokens=2" %%H in ('gh api -i %ENDPOINT% 2^>nul ^| findstr /B "HTTP/"') do set "PROTECTION_STATUS=%%H"
if "%PROTECTION_STATUS%"=="200" (
  echo ERROR: main already has branch protection. No existing policy will be overwritten.
  goto failed
)
if not "%PROTECTION_STATUS%"=="404" (
  echo ERROR: Could not establish that main is unprotected. HTTP status: %PROTECTION_STATUS%
  goto failed
)

set "RULESET_COUNT="
for /f "delims=" %%A in ('gh api repos/%REPO%/rulesets --jq length 2^>nul') do set "RULESET_COUNT=%%A"
if not "%RULESET_COUNT%"=="0" (
  echo ERROR: Rulesets exist or could not be read. Review them before applying this policy.
  goto failed
)

set "COLLABORATOR_COUNT="
for /f "delims=" %%A in ('gh api repos/%REPO%/collaborators --jq length 2^>nul') do set "COLLABORATOR_COUNT=%%A"
if not "%COLLABORATOR_COUNT%"=="2" (
  echo ERROR: Expected only bell-wagtail and in0ho1no as accepted collaborators. Current count: %COLLABORATOR_COUNT%
  goto failed
)

set "REVIEWER_PERMISSION="
for /f "delims=" %%A in ('gh api repos/%REPO%/collaborators/in0ho1no/permission --jq .permission 2^>nul') do set "REVIEWER_PERMISSION=%%A"
if /i not "%REVIEWER_PERMISSION%"=="write" (
  echo ERROR: in0ho1no must have write access to provide the mandatory approval.
  goto failed
)

echo Repository: %REPO%
echo Branch: main
echo Accepted collaborators:
gh api repos/%REPO%/collaborators --jq ".[].login"
if errorlevel 1 goto failed
echo.
echo PR author: bell-wagtail. Required approving reviewer: in0ho1no.
echo The reviewer must not be the author or the last person who pushed to the PR branch.
echo Required: one review, the up-to-date build check, no admin bypass, no force push or deletion.
echo Existing merge-commit history remains allowed.
if defined READ_ONLY (
  echo Check-only mode: no GitHub setting was changed.
  goto done
)
echo Applying now will change GitHub branch protection.
choice /C YN /N /M "Apply this policy now? [Y/N] "
if errorlevel 2 (
  echo Cancelled. No GitHub setting was changed.
  goto done
)

gh api -X PUT %ENDPOINT% --input "%BODY%" --silent
if errorlevel 1 (
  echo ERROR: GitHub rejected the update. Check the CLI output above.
  goto failed
)

:verify
echo.
echo Current main branch protection:
gh api %ENDPOINT% --jq "{strict: .required_status_checks.strict, checks: .required_status_checks.checks, enforce_admins: .enforce_admins.enabled, reviews: .required_pull_request_reviews, allow_force_pushes: .allow_force_pushes.enabled, allow_deletions: .allow_deletions.enabled, conversation_resolution: .required_conversation_resolution.enabled, linear_history: .required_linear_history.enabled}"
if errorlevel 1 goto failed
echo.
echo Verify that build is pinned to GitHub Actions app 15368, one approval is required, and all protective booleans match the JSON file.
goto done

:failed
echo.
echo No additional GitHub command will be run by this script.
if not defined READ_ONLY if /i not "%~1"=="/verify" pause
exit /b 1

:done
echo.
if not defined READ_ONLY if /i not "%~1"=="/verify" pause
exit /b 0
