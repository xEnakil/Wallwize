param(
  [string]$Python = "",
  [string]$ReleaseRoot = "",
  [switch]$SkipDependencyInstall,
  [switch]$SkipTests,
  [switch]$SkipBackendBuild,
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

function Assert-ExternalCommandSucceeded {
  param([Parameter(Mandatory = $true)][string]$Label)

  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE. Release outputs were not refreshed."
  }
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

function Assert-NodeMeetsToolchainRequirement {
  param([Parameter(Mandatory = $true)][string]$WorkingDirectory)

  Push-Location -LiteralPath $WorkingDirectory
  try {
    $rawVersion = (& node -v).Trim().TrimStart("v")
    Assert-ExternalCommandSucceeded "node -v"
    $parsed = [Version]$rawVersion

    # Electron 42's toolchain (electron, @electron/rebuild, @electron/get,
    # node-abi) declares engines.node >=22.12.0. Older Node also fails deep
    # inside electron-builder with a cryptic ERR_REQUIRE_ESM when loading
    # app-builder-lib's ESM-only @noble/hashes dependency via require().
    $minimum = [Version]"22.12.0"
    if ($parsed -lt $minimum) {
      throw "Node $rawVersion (resolved in $WorkingDirectory) does not meet this project's requirement (>=22.12.0, see UI/package.json engines). Install a matching Node and either set it as the active version or pin it for this project (e.g. 'nodist local 22.23.1' from $WorkingDirectory, which writes a .node-version file)."
    }
    Write-Host "Node:          v$rawVersion (OK)"
  }
  finally {
    Pop-Location
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

  if ($SkipBackendBuild) {
    $existingBackendExe = Join-Path $repoRoot "build/backend-dist/wallwize-backend.exe"
    if (-not (Test-Path -LiteralPath $existingBackendExe)) {
      throw "-SkipBackendBuild was set but no existing backend executable was found at $existingBackendExe. Run once without -SkipBackendBuild first."
    }
  }

  Write-Host "Project root:  $repoRoot"
  Write-Host "Package root:  $packageRoot"
  Write-Host "UI root:       $uiRoot"
  Write-Host "Release root:  $releaseRoot"
  Write-Host "Version:       $version"
  Write-Host "Python:        $Python"
  Assert-NodeMeetsToolchainRequirement -WorkingDirectory $uiRoot
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
      Assert-ExternalCommandSucceeded "Install PyInstaller"
      & $Python -m pip install -e .
      Assert-ExternalCommandSucceeded "Install Wallwize Python package"
    }
    finally {
      Pop-Location
    }
  }

  Invoke-Logged "Install desktop dependencies" {
    Push-Location -LiteralPath $uiRoot
    try {
      $lockPath = Join-Path $uiRoot "package-lock.json"
      $installHashPath = Join-Path $uiRoot "node_modules/.install-hash"
      $nodeModulesPath = Join-Path $uiRoot "node_modules"

      if (Test-Path -LiteralPath $lockPath) {
        $lockHash = (Get-FileHash -LiteralPath $lockPath -Algorithm SHA256).Hash
        $upToDate = (Test-Path -LiteralPath $nodeModulesPath) -and
                    (Test-Path -LiteralPath $installHashPath) -and
                    ((Get-Content -Raw -LiteralPath $installHashPath).Trim() -eq $lockHash)

        if ($upToDate) {
          Write-Host "node_modules already matches package-lock.json; skipping npm ci."
        }
        else {
          npm ci
          Assert-ExternalCommandSucceeded "npm ci"
          Set-Content -LiteralPath $installHashPath -Value $lockHash -Encoding UTF8 -NoNewline
        }
      }
      else {
        npm install
        Assert-ExternalCommandSucceeded "npm install"
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
      Assert-ExternalCommandSucceeded "Backend tests"
    }
    finally {
      $env:PYTHONPATH = $previousPythonPath
      Pop-Location
    }
  }
}

if (-not $SkipBackendBuild) {
  Invoke-Logged "Build backend executable" {
    Push-Location -LiteralPath $repoRoot
    try {
      & $Python -m PyInstaller --noconfirm --distpath build/backend-dist --workpath build/backend-work packaging/wallwize-backend.spec
      Assert-ExternalCommandSucceeded "Backend executable build"
    }
    finally {
      Pop-Location
    }
  }
}
else {
  Write-Host ""
  Write-Host "==> Build backend executable"
  Write-Host "Skipped (-SkipBackendBuild); reusing existing build/backend-dist/wallwize-backend.exe"
}

$uiRelease = Join-Path $uiRoot "release"
Invoke-Logged "Clean Windows desktop build output" {
  Remove-GeneratedFolder -Path $uiRelease -Parent $uiRoot
}
$desktopBuildStartedUtc = [DateTime]::UtcNow

Invoke-Logged "Build Windows desktop bundles" {
  Push-Location -LiteralPath $uiRoot
  try {
    npm run bundle
    Assert-ExternalCommandSucceeded "Windows desktop bundle build"
  }
  finally {
    Pop-Location
  }

  $expectedDesktopArtifacts = @(
    (Join-Path $uiRelease "Wallwize Setup $version.exe"),
    (Join-Path $uiRelease "Wallwize Portable $version.exe"),
    (Join-Path $uiRelease "win-unpacked/resources/app.asar")
  )

  foreach ($artifact in $expectedDesktopArtifacts) {
    if (-not (Test-Path -LiteralPath $artifact)) {
      throw "Desktop build completed without expected artifact: $artifact"
    }

    $artifactInfo = Get-Item -LiteralPath $artifact
    if ($artifactInfo.LastWriteTimeUtc -lt $desktopBuildStartedUtc.AddSeconds(-2)) {
      throw "Refusing to publish stale desktop artifact: $artifact"
    }
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

  $installer = Join-Path $uiRelease "Wallwize Setup $version.exe"
  $portableExe = Join-Path $uiRelease "Wallwize Portable $version.exe"
  $backendExe = Join-Path $repoRoot "build/backend-dist/wallwize-backend.exe"
  $unpacked = Join-Path $uiRelease "win-unpacked"
  $portableFolder = Join-Path (Join-Path $releaseRoot "portable-folder") $appFolderName
  $assets = Join-Path $releaseRoot "github-release-assets"
  $metadata = Join-Path $releaseRoot "build-metadata"

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

  # The folder-style portable build isn't launched through electron-builder's
  # portable wrapper, so main.cjs can't rely on PORTABLE_EXECUTABLE_DIR to
  # detect portable mode. It looks for this marker next to the exe instead
  # (see PORTABLE_MARKER_FILE in UI/electron/main.cjs) to decide whether to
  # store app data in a local Data folder instead of the OS user-data folder.
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

  foreach ($pattern in @("builder-effective-config.yaml", "builder-debug.yml", "*.blockmap", "latest.yml")) {
    Get-ChildItem -Path $uiRelease -Filter $pattern -File -ErrorAction SilentlyContinue |
      Copy-Item -Destination $metadata
  }

  $summary = [ordered]@{
    version = $version
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    repoRoot = $repoRoot
    releaseRoot = $releaseRoot
    installer = $installer
    portableExe = $portableExe
    folderPortable = $portableFolder
    backendExe = $backendExe
    uiDistIndexSha256 = (Get-FileHash -LiteralPath (Join-Path $uiRoot "dist/index.html") -Algorithm SHA256).Hash
    appAsarSha256 = (Get-FileHash -LiteralPath (Join-Path $unpacked "resources/app.asar") -Algorithm SHA256).Hash
    portableExeSha256 = (Get-FileHash -LiteralPath $portableExe -Algorithm SHA256).Hash
  }
  $summary | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $metadata "build-summary.json") -Encoding UTF8
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
        Assert-ExternalCommandSucceeded "Portable ZIP creation"
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

Invoke-Logged "Write release-bundles README" {
  $readme = @"
# Release Bundles

This folder is generated by:

````powershell
.\scripts\build-release.ps1
````

For a fast rebuild after UI-only changes (dependencies, backend, and tests unchanged):

````powershell
.\scripts\build-release.ps1 -SkipDependencyInstall -SkipTests -SkipBackendBuild
````

## Contents

- ``installer/Wallwize Setup $version.exe`` - normal Windows installer with install-folder selection.
- ``windows-portable/Wallwize Portable $version.exe`` - single-file portable Windows app.
- ``portable-folder/$appFolderName/`` - folder-style portable build.
- ``github-release-assets/`` - files to upload to GitHub Releases.
- ``backend/wallwize-backend.exe`` - backend executable bundled into the desktop app.
- ``build-metadata/`` - build metadata and Electron Builder files.

These are generated release outputs. Do not commit them to the source repository.
"@
  Set-Content -Path (Join-Path $releaseRoot "README.md") -Value $readme -Encoding UTF8
}

Invoke-Logged "Release output" {
  Get-ChildItem -LiteralPath (Join-Path $releaseRoot "github-release-assets") |
    Select-Object Name, Length |
    Format-Table -AutoSize

  Write-Host ""
  Write-Host "Release bundles refreshed at:"
  Write-Host $releaseRoot
}
