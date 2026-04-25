@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-econtact-auto-approve.ps1" -Execute
exit /b %ERRORLEVEL%
