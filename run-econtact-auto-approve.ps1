param(
    [switch]$Execute,
    [string]$CredentialPath = "$PSScriptRoot\econtact-credential.xml"
)

if (-not (Test-Path -LiteralPath $CredentialPath)) {
    throw "Credential file not found: $CredentialPath. Run setup-econtact-credential.ps1 first."
}

$credential = Import-Clixml -LiteralPath $CredentialPath
$env:ECONTACT_USER = $credential.UserName
$env:ECONTACT_PASSWORD = $credential.GetNetworkCredential().Password

$nodeArgs = @("$PSScriptRoot\econtact-auto-approve.js")
if ($Execute) {
    $nodeArgs += "--execute"
}

node @nodeArgs
