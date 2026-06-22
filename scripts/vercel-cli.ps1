$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')

& (Join-Path $root 'node_modules\.bin\vercel.cmd') @args
exit $LASTEXITCODE
