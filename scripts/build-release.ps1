param(
  [string]$Python = "",
  [string]$ReleaseRoot = "",
  [switch]$SkipDependencyInstall,
  [switch]$SkipTests,
  [switch]$NoFolderZip,
  [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-ChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Child,
    [Parameter(Mandatory = $true)][string]$Parent
  )

  $resolvedChild = Resolve-FullPath $Child
  $resolvedParent = Resolve-FullPath $Parent
  if (-not $resolvedParent.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $resolvedParent = "$resolvedParent$([System.IO.Path]::DirectorySeparatorChar)"
  }

  if (-not $resolvedChild.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside release folder: $resolvedChild"
  }
}

function Invoke-Logged {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  & $Command
}

function Remove-GeneratedFolder {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Parent
  )

  Assert-ChildPath -Child $Path -Parent $Parent
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Assert-ReleaseRootPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  $resolved = Resolve-FullPath $Path
  $trimmed = $resolved.TrimEnd([char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar))
  if ([System.IO.Path]::GetFileName($trimmed) -ne "release-bundles") {
    throw "Refusing to clean release output because the folder is not named release-bundles: $resolved"
  }
}

$scriptPath = $PSCommandPath
if ([string]::IsNullOrWhiteSpace($scriptPath)) {
  $scriptPath = $MyInvocation.MyCommand.Path
}

$scriptDir = Resolve-FullPath (Split-Path -Parent $scriptPath)
$repoRoot = Resolve-FullPath (Join-Path $scriptDir "..")
$repoParent = Resolve-FullPath (Join-Path $repoRoot "..")
$repoFolderName = Split-Path -Leaf $repoRoot

if (
  $repoFolderName -ieq "github-repository" -and
  (
    (Test-Path -LiteralPath (Join-Path $repoParent "ai-guides")) -or
    (Test-Path -LiteralPath (Join-Path $repoParent "design-set")) -or
    (Test-Path -LiteralPath (Join-Path $repoParent "release-bundles"))
  )
) {
  $packageRoot = $repoParent
}
else {
  $packageRoot = $repoRoot
}

if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
  $ReleaseRoot = Join-Path $packageRoot "release-bundles"
}
$releaseRoot = Resolve-FullPath $ReleaseRoot
$uiRoot = Join-Path $repoRoot "UI"
$uiPackageJsonPath = Join-Path $uiRoot "package.json"
$uiPackageJson = Get-Content -Raw -Path $uiPackageJsonPath | ConvertFrom-Json
$version = [string]$uiPackageJson.version
$appFolderName = "Wallwize $version"

if ([string]::IsNullOrWhiteSpace($Python)) {
  if (-not [string]::IsNullOrWhiteSpace($env:WALLWIZE_PYTHON)) {
    $Python = $env:WALLWIZE_PYTHON
  }
  else {
    $bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (Test-Path -LiteralPath $bundledPython) {
      $Python = $bundledPython
    }
    else {
      $Python = "python"
    }
  }
}

Invoke-Logged "Validate release inputs" {
  $requiredPaths = @(
    $uiPackageJsonPath,
    (Join-Path $repoRoot "pyproject.toml"),
    (Join-Path $repoRoot "src"),
    (Join-Path $repoRoot "scripts/backend_entry.py"),
    (Join-Path $repoRoot "packaging/wallwize-backend.spec"),
    (Join-Path $uiRoot "electron/main.cjs")
  )

  foreach ($requiredPath in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
      throw "Missing required release input: $requiredPath"
    }
  }

  Write-Host "Project root:  $repoRoot"
  Write-Host "Package root:  $packageRoot"
  Write-Host "UI root:       $uiRoot"
  Write-Host "Release root:  $releaseRoot"
  Write-Host "Version:       $version"
  Write-Host "Python:        $Python"
}

if ($ValidateOnly) {
  Write-Host ""
  Write-Host "Validation complete. No build artifacts were generated."
  return
}

Invoke-Logged "Clean release-bundles folder" {
  Assert-ReleaseRootPath -Path $releaseRoot
  $releaseParent = Resolve-FullPath (Split-Path -Parent $releaseRoot)
  Assert-ChildPath -Child $releaseRoot -Parent $releaseParent
  if (Test-Path -LiteralPath $releaseRoot) {
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
}

if (-not $SkipDependencyInstall) {
  Invoke-Logged "Install Python build dependencies" {
    Push-Location -LiteralPath $repoRoot
    try {
      & $Python -m pip install pyinstaller
      & $Python -m pip install -e .
    }
    finally {
      Pop-Location
    }
  }

  Invoke-Logged "Install desktop dependencies" {
    Push-Location -LiteralPath $uiRoot
    try {
      if (Test-Path -LiteralPath (Join-Path $uiRoot "package-lock.json")) {
        npm ci
      }
      else {
        npm install
      }
    }
    finally {
      Pop-Location
    }
  }
}

if (-not $SkipTests) {
  Invoke-Logged "Run backend tests" {
    $previousPythonPath = $env:PYTHONPATH
    Push-Location -LiteralPath $repoRoot
    try {
      $env:PYTHONPATH = Join-Path $repoRoot "src"
      & $Python -m unittest discover -s tests
    }
    finally {
      $env:PYTHONPATH = $previousPythonPath
      Pop-Location
    }
  }
}

Invoke-Logged "Build backend executable" {
  Push-Location -LiteralPath $repoRoot
  try {
    & $Python -m PyInstaller --noconfirm --distpath build/backend-dist --workpath build/backend-work packaging/wallwize-backend.spec
  }
  finally {
    Pop-Location
  }
}

Invoke-Logged "Build Windows desktop bundles" {
  Push-Location -LiteralPath $uiRoot
  try {
    npm run bundle
  }
  finally {
    Pop-Location
  }
}

$bundleDirs = @(
  "installer",
  "windows-portable",
  "portable-folder",
  "backend",
  "build-metadata",
  "github-release-assets"
)

Invoke-Logged "Refresh release-bundles" {
  foreach ($dirName in $bundleDirs) {
    Remove-GeneratedFolder -Path (Join-Path $releaseRoot $dirName) -Parent $releaseRoot
  }

  $uiRelease = Join-Path $uiRoot "release"
  $installer = Join-Path $uiRelease "Wallwize Setup $version.exe"
  $portableExe = Join-Path $uiRelease "Wallwize Portable $version.exe"
  $blockmap = Join-Path $uiRelease "Wallwize Setup $version.exe.blockmap"
  $backendExe = Join-Path $repoRoot "build/backend-dist/wallwize-backend.exe"
  $unpacked = Join-Path $uiRelease "win-unpacked"
  $portableFolder = Join-Path (Join-Path $releaseRoot "portable-folder") $appFolderName
  $assets = Join-Path $releaseRoot "github-release-assets"

  foreach ($required in @($installer, $portableExe, $backendExe, $unpacked)) {
    if (-not (Test-Path -LiteralPath $required)) {
      throw "Missing expected build artifact: $required"
    }
  }

  Copy-Item -LiteralPath $installer -Destination (Join-Path $releaseRoot "installer")
  Copy-Item -LiteralPath $portableExe -Destination (Join-Path $releaseRoot "windows-portable")
  Copy-Item -LiteralPath $backendExe -Destination (Join-Path $releaseRoot "backend")
  Copy-Item -LiteralPath $installer -Destination $assets
  Copy-Item -LiteralPath $portableExe -Destination $assets
  Copy-Item -LiteralPath $unpacked -Destination $portableFolder -Recurse

  $portableData = Join-Path $portableFolder "Data"
  if (Test-Path -LiteralPath $portableData) {
    Remove-Item -LiteralPath $portableData -Recurse -Force
  }

  @{
    mode = "portable-folder"
    product = "Wallwize"
    version = $version
    dataFolder = "Data"
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $portableFolder "wallwize-portable.json") -Encoding UTF8

  $builderConfig = Join-Path $uiRelease "builder-effective-config.yaml"
  $builderDebug = Join-Path $uiRelease "builder-debug.yml"
  if (Test-Path -LiteralPath $builderConfig) {
    Copy-Item -LiteralPath $builderConfig -Destination (Join-Path $releaseRoot "build-metadata")
  }
  if (Test-Path -LiteralPath $builderDebug) {
    Copy-Item -LiteralPath $builderDebug -Destination (Join-Path $releaseRoot "build-metadata")
  }
  if (Test-Path -LiteralPath $blockmap) {
    Copy-Item -LiteralPath $blockmap -Destination (Join-Path $releaseRoot "build-metadata")
  }
}

if (-not $NoFolderZip) {
  Invoke-Logged "Create folder-style portable ZIP" {
    $portableRoot = Join-Path $releaseRoot "portable-folder"
    $zipPath = Join-Path (Join-Path $releaseRoot "github-release-assets") "Wallwize Folder Portable $version.zip"
    if (Test-Path -LiteralPath $zipPath) {
      Remove-Item -LiteralPath $zipPath -Force
    }

    $sevenZip = Join-Path $uiRoot "node_modules/7zip-bin/win/x64/7za.exe"
    if (Test-Path -LiteralPath $sevenZip) {
      Push-Location -LiteralPath $portableRoot
      try {
        & $sevenZip a -tzip -mx=1 $zipPath "$appFolderName\*"
      }
      finally {
        Pop-Location
      }
    }
    else {
      Compress-Archive -Path (Join-Path $portableRoot $appFolderName) -DestinationPath $zipPath -CompressionLevel Fastest
    }
  }
}

Invoke-Logged "Release output" {
  Get-ChildItem -LiteralPath (Join-Path $releaseRoot "github-release-assets") |
    Select-Object Name, Length |
    Format-Table -AutoSize
}
