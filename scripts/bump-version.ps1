param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("patch", "minor", "major")]
    [string]$Type
)

# 1. Read current version from package.json
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$current = $pkg.version
$parts = $current.Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# 2. Calculate new version
switch ($Type) {
    "patch" { $patch++ }
    "minor" { $minor++; $patch = 0 }
    "major" { $major++; $minor = 0; $patch = 0 }
}
$newVersion = "$major.$minor.$patch"

Write-Host "Bumping version: $current -> $newVersion ($Type)" -ForegroundColor Cyan

# 3. Update server.json (both version fields)
$serverJson = Get-Content "server.json" -Raw | ConvertFrom-Json
$serverJson.version = $newVersion
$serverJson.packages[0].version = $newVersion
$serverJson | ConvertTo-Json -Depth 10 | Set-Content "server.json" -Encoding UTF8

Write-Host "server.json updated" -ForegroundColor Green

# 4. Run npm version (updates package.json + package-lock.json, no git commit/tag)
npm version $Type --no-git-tag-version | Out-Null

Write-Host "package.json updated" -ForegroundColor Green

# 5. Verify alignment
$pkgCheck = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
$srvCheck = (Get-Content "server.json" -Raw | ConvertFrom-Json).version
$srvPkgCheck = (Get-Content "server.json" -Raw | ConvertFrom-Json).packages[0].version

if ($pkgCheck -eq $srvCheck -and $pkgCheck -eq $srvPkgCheck) {
    Write-Host "All 3 versions aligned: $pkgCheck" -ForegroundColor Green
} else {
    Write-Host "MISMATCH! pkg=$pkgCheck srv=$srvCheck srvPkg=$srvPkgCheck" -ForegroundColor Red
    exit 1
}
