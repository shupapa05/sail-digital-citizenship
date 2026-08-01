$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw ".env.local not found. Run scripts\setup-local-env.ps1 first."
}

Write-Host ""
Write-Host "Paste GOOGLE_REFRESH_TOKEN. It will be hidden while typing/pasting."
$tokenSecure = Read-Host "GOOGLE_REFRESH_TOKEN" -AsSecureString

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSecure)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$lines = Get-Content -LiteralPath $envPath
$found = $false
$updated = foreach ($line in $lines) {
  if ($line -like "GOOGLE_REFRESH_TOKEN=*") {
    $found = $true
    "GOOGLE_REFRESH_TOKEN=$token"
  } else {
    $line
  }
}

if (-not $found) {
  $updated += "GOOGLE_REFRESH_TOKEN=$token"
}

Set-Content -LiteralPath $envPath -Value $updated -Encoding UTF8

Write-Host ""
Write-Host "Saved GOOGLE_REFRESH_TOKEN to .env.local."
Write-Host "Restart the dev server, then test /api/calendar/events."
