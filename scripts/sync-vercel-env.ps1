# Sync Supabase env vars from .env.local to Vercel (Production, Preview, Development)
Set-Location $PSScriptRoot\..

$allowed = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "HUBSPOT_ACCESS_TOKEN",
  "CRON_SECRET"
)

Get-Content .env.local | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $name = $matches[1]
    $value = $matches[2].Trim()
    if ($allowed -contains $name -and $value -and $value -notmatch '^(your_|VOEKHIER)') {
      Write-Host "Setting $name on Vercel..."
      foreach ($target in @("production", "preview", "development")) {
        npx vercel env add $name $target --value $value --yes --force 2>&1 | Out-Null
      }
    }
  }
}

Write-Host "Done. Redeploy with: npx vercel --prod --yes"
