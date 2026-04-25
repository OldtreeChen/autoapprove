param(
    [string]$UserName = "oldtree.chen",
    [string]$CredentialPath = "$PSScriptRoot\econtact-credential.xml"
)

$credential = Get-Credential -UserName $UserName -Message "Enter eContact password"
$credential | Export-Clixml -LiteralPath $CredentialPath
Write-Host "Saved encrypted credential to $CredentialPath"
