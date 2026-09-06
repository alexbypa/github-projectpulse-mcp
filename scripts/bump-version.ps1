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

# 3. Update server.json (in-place replacement, preserves formatting)
$serverContent = Get-Content "server.json" -Raw
$serverContent = $serverContent -replace "`"version`": `"$current`"", "`"version`": `"$newVersion`""
$serverContent | Set-Content "server.json" -NoNewline -Encoding UTF8

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

# 6. Git commit + tag
git add package.json server.json package-lock.json
git commit -m "$newVersion"
git tag "v$newVersion"

Write-Host "Committed and tagged v$newVersion" -ForegroundColor Green
Write-Host "Run: git push && git push --tags" -ForegroundColor Yellow
