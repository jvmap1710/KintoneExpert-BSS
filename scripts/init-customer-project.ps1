[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')]
    [string]$ProjectSlug,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$DisplayName,

    [Parameter()]
    [ValidateSet('demo', 'customer')]
    [string]$ProjectType = 'customer',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$Objective = 'Not specified'
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectsRoot = Join-Path $repositoryRoot 'projects'
$templatePath = Join-Path $projectsRoot '_template'
$targetPath = Join-Path $projectsRoot $ProjectSlug

$resolvedProjectsRoot = [System.IO.Path]::GetFullPath($projectsRoot)
$resolvedTargetPath = [System.IO.Path]::GetFullPath($targetPath)
$requiredPrefix = $resolvedProjectsRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

if (-not $resolvedTargetPath.StartsWith(
    $requiredPrefix,
    [System.StringComparison]::OrdinalIgnoreCase
)) {
    throw 'The project path must stay inside the repository projects directory.'
}

if (-not (Test-Path -LiteralPath $templatePath -PathType Container)) {
    throw "Project template not found: $templatePath"
}

if (Test-Path -LiteralPath $targetPath) {
    throw "Project workspace already exists: $targetPath"
}

Copy-Item -LiteralPath $templatePath -Destination $targetPath -Recurse

$projectTypeLabel = if ($ProjectType -eq 'demo') {
    'Demo / PoC'
} else {
    'Customer implementation'
}
$projectObjective = $Objective.Trim().Replace("`r", ' ').Replace("`n", ' ')
$projectObjective = $projectObjective.Replace('|', '\|')

$projectFile = Join-Path $targetPath 'PROJECT.md'
$projectContent = Get-Content -Raw -Encoding utf8 -LiteralPath $projectFile
$projectContent = $projectContent.Replace('{{PROJECT_SLUG}}', $ProjectSlug)
$projectContent = $projectContent.Replace('{{DISPLAY_NAME}}', $DisplayName)
$projectContent = $projectContent.Replace('{{PROJECT_TYPE}}', $projectTypeLabel)
$projectContent = $projectContent.Replace('{{OBJECTIVE}}', $projectObjective)
$projectContent = $projectContent.Replace(
    '{{CREATED_DATE}}',
    (Get-Date -Format 'yyyy-MM-dd')
)
Set-Content -Encoding utf8 -LiteralPath $projectFile -Value $projectContent

Write-Output "Created $ProjectType project workspace: $targetPath"
Write-Output "Input:  $(Join-Path $targetPath 'input')"
Write-Output "Output: $(Join-Path $targetPath 'output')"
