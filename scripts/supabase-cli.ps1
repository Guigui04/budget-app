$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$configHome = Join-Path $root '.supabase-home'
New-Item -ItemType Directory -Force $configHome | Out-Null

$env:HOME = $configHome
$env:USERPROFILE = $configHome

& (Join-Path $root 'node_modules\.bin\supabase.cmd') @args
exit $LASTEXITCODE
