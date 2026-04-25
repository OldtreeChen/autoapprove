# eContact Auto Approve

API automation for `https://econtact.ai3.cloud/ecp/`.

Default mode is dry-run and does not approve anything:

```powershell
$env:ECONTACT_USER = "oldtree.chen"
$env:ECONTACT_PASSWORD = "<password>"
node .\econtact-auto-approve.js
```

Execute mode sends approval API calls:

```powershell
node .\econtact-auto-approve.js --execute
```

Behavior:

- Logs in through the same RSA login flow as `Qs.OnlineUser.Login.page`.
- Switches identity after login. Default target is the captured `陳慕霖-專案二部 (部門經理)` identity, and it can be overridden with `ECONTACT_IDENTITY_ID` or `ECONTACT_IDENTITY_NAME`.
- Reads all current `Wf.WorkItem` todos.
- Opens `Wf.WorkItem.BatchPass.page` first and only treats items without `message` as batch-passable.
- Keeps `請(休)假單審核` out of batch approval by default.
- If there are no batch-passable items, only `請(休)假單審核` is considered for individual approval.
- Individual leave approval requires `F_StartDate == F_ActStartDate` and `F_EndDate == F_ActEndDate`.
- Leave requests are evaluated even after batch approval completes.

To save credentials encrypted for the current Windows user:

```powershell
.\setup-econtact-credential.ps1
```

To run manually using the encrypted credential:

```powershell
.\run-econtact-auto-approve.ps1
.\run-econtact-auto-approve.ps1 -Execute
```

To register a weekday scheduled task:

```powershell
.\register-econtact-task.ps1
```

`register-econtact-task.ps1` defaults to `10:00` and schedules Monday-Friday only. Company holidays are not checked.
The registration script first tries PowerShell `ScheduledTasks` cmdlets and falls back to `schtasks.exe` for machines where the module is blocked.
Before enabling the task, make sure `econtact-credential.xml` has been created by `setup-econtact-credential.ps1`.

## GitHub Actions schedule

This repo also includes [`C:\Codex\AutoApprove\.github\workflows\econtact-auto-approve.yml`](C:\Codex\AutoApprove\.github\workflows\econtact-auto-approve.yml), which runs at `02:00 UTC` on Monday-Friday.
That is `10:00` in `Asia/Taipei` and matches the weekday schedule requirement.

Set these repository secrets before enabling the workflow:

- `ECONTACT_USER` required
- `ECONTACT_PASSWORD` required
- `ECONTACT_BASE_URL` optional, defaults to `https://econtact.ai3.cloud/ecp/`
- `ECONTACT_IDENTITY_ID` optional
- `ECONTACT_IDENTITY_NAME` optional

Notes:

- GitHub Actions cron uses UTC.
- Scheduled workflows only run from the default branch.
- `econtact-credential.xml` is not used by GitHub Actions; use repository secrets instead.
