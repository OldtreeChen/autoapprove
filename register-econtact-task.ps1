param(
    [string]$TaskName = "EContact Auto Approve",
    [string]$At = "10:00"
)

$ErrorActionPreference = "Stop"

$taskRunner = Join-Path $PSScriptRoot "run-econtact-auto-approve-execute.cmd"
$taskCommand = "cmd.exe /c `"$taskRunner`""

try {
    $action = New-ScheduledTaskAction -Execute $taskRunner
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $At
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
    Write-Host "Registered task '$TaskName' for Monday-Friday at $At via ScheduledTasks module."
    exit 0
}
catch {
    Write-Warning "ScheduledTasks module registration failed: $($_.Exception.Message)"
    Write-Warning "Falling back to schtasks.exe."
}

$schtasksArgs = @(
    "/Create",
    "/F",
    "/TN", $TaskName,
    "/SC", "WEEKLY",
    "/D", "MON,TUE,WED,THU,FRI",
    "/ST", $At,
    "/TR", $taskCommand
)

schtasks.exe @schtasksArgs | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "schtasks.exe failed with exit code $LASTEXITCODE."
}

Write-Host "Registered task '$TaskName' for Monday-Friday at $At via schtasks.exe."
