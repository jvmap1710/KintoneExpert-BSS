[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')]
    [string]$ProjectSlug,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$DisplayName
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectsRoot = Join-Path $repositoryRoot 'projects'
$templatePath = Join-Path $projectsRoot '_template'
$targetPath = Join-Path $projectsRoot $ProjectSlug
$outputRoot = Join-Path $repositoryRoot 'output'
$outputPath = Join-Path $outputRoot $ProjectSlug

$resolvedProjectsRoot = [System.IO.Path]::GetFullPath($projectsRoot)
$resolvedTargetPath = [System.IO.Path]::GetFullPath($targetPath)
$resolvedOutputRoot = [System.IO.Path]::GetFullPath($outputRoot)
$resolvedOutputPath = [System.IO.Path]::GetFullPath($outputPath)
$requiredPrefix = $resolvedProjectsRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar
$requiredOutputPrefix = $resolvedOutputRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

if (-not $resolvedTargetPath.StartsWith(
    $requiredPrefix,
    [System.StringComparison]::OrdinalIgnoreCase
)) {
    throw 'The project path must stay inside the repository projects directory.'
}

if (-not $resolvedOutputPath.StartsWith(
    $requiredOutputPrefix,
    [System.StringComparison]::OrdinalIgnoreCase
)) {
    throw 'The output path must stay inside the repository output directory.'
}

if (-not (Test-Path -LiteralPath $templatePath -PathType Container)) {
    throw "Project template not found: $templatePath"
}

if (Test-Path -LiteralPath $targetPath) {
    throw "Project workspace already exists: $targetPath"
}

if (Test-Path -LiteralPath $outputPath) {
    throw "Project output directory already exists: $outputPath"
}

Copy-Item -LiteralPath $templatePath -Destination $targetPath -Recurse
New-Item -ItemType Directory -Path $outputPath | Out-Null

$projectFile = Join-Path $targetPath 'PROJECT.md'
$projectContent = Get-Content -Raw -Encoding utf8 -LiteralPath $projectFile
$projectContent = $projectContent.Replace('{{PROJECT_SLUG}}', $ProjectSlug)
$projectContent = $projectContent.Replace('{{DISPLAY_NAME}}', $DisplayName)
$projectContent = $projectContent.Replace(
    '{{CREATED_DATE}}',
    (Get-Date -Format 'yyyy-MM-dd')
)
Set-Content -Encoding utf8 -LiteralPath $projectFile -Value $projectContent

Write-Output "Created customer project workspace: $targetPath"
Write-Output "Created HTML output directory: $outputPath"
