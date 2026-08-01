$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"

Write-Host ""
Write-Host "SchoolTask Vercel/Supabase local setup"
Write-Host "Secrets are saved only to this computer's .env.local file."
Write-Host ""

$clientId = Read-Host "GOOGLE_CLIENT_ID"
$clientSecretSecure = Read-Host "GOOGLE_CLIENT_SECRET" -AsSecureString
$calendarIds = Read-Host "GOOGLE_CALENDAR_IDS (comma-separated, leave empty for primary)"

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecretSecure)
try {
  $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$lines = @(
  "NEXT_PUBLIC_SUPABASE_URL=https://mmczwvzkvpabsokwqqho.supabase.co",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QWhO3irnQPyHBOT4z5AmoQ_z9_vGast",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "",
  "GOOGLE_CLIENT_ID=$clientId",
  "GOOGLE_CLIENT_SECRET=$clientSecret",
  "GOOGLE_REDIRECT_URI=http://localhost:3099/api/google/oauth/callback",
  "",
  "GOOGLE_CALENDAR_ID=",
  "GOOGLE_CALENDAR_IDS=$calendarIds",
  "GOOGLE_REFRESH_TOKEN="
)

Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "Saved: $envPath"
Write-Host "Next, start the server and open the OAuth URL."
Write-Host ""
Write-Host "  npm run dev -- --hostname 127.0.0.1 --port 3099"
Write-Host "  http://localhost:3099/api/google/oauth/start"
