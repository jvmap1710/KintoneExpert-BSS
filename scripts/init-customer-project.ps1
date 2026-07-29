[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')]
    [string]$ProjectSlug,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$DisplayName,

    [Parameter()]
    [ValidateSet('analysis', 'demo', 'customer', 'assessment')]
    [string]$ProjectType = 'customer',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$Objective = 'Not specified',

    [Parameter()]
    [ValidateSet(
        'discovery-intake',
        'customer-context',
        'current-state',
        'future-state',
        'demo-fast-track',
        'project-delivery',
        'existing-solution',
        'expert-consultation'
    )]
    [string]$EntryRoute
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

$projectTypeLabels = @{
    analysis = 'Analysis / Advisory'
    demo = 'Demo / PoC'
    customer = 'Customer implementation'
    assessment = 'Existing solution assessment'
}
$projectTypeLabel = $projectTypeLabels[$ProjectType]

if (-not $EntryRoute) {
    $EntryRoute = switch ($ProjectType) {
        'analysis' { 'discovery-intake' }
        'demo' { 'demo-fast-track' }
        'assessment' { 'existing-solution' }
        default { 'project-delivery' }
    }
}

$entryRouteLabels = @{
    'discovery-intake' = 'Discovery Intake'
    'customer-context' = 'Customer Context'
    'current-state' = 'Current-State Assessment / As-Is Analysis'
    'future-state' = 'Future-State Design / To-Be Analysis'
    'demo-fast-track' = 'Demo / PoC Fast Track'
    'project-delivery' = 'Project Delivery'
    'existing-solution' = 'Existing Solution Assessment'
    'expert-consultation' = 'Expert Consultation / Expert Panel'
}
$currentPhaseLabels = @{
    'discovery-intake' = 'Discovery Intake'
    'customer-context' = 'Customer Context readiness'
    'current-state' = 'Current-State readiness'
    'future-state' = 'Future-State readiness'
    'demo-fast-track' = 'Demo / PoC Fast Track readiness'
    'project-delivery' = 'Project Delivery readiness'
    'existing-solution' = 'Existing Solution Assessment'
    'expert-consultation' = 'Expert Consultation'
}
$deliveryTrackLabels = @{
    analysis = 'Analysis'
    demo = 'Demo / PoC'
    customer = 'Real Project'
    assessment = 'Assessment'
}

$allowedTypesByRoute = @{
    'discovery-intake' = @('analysis', 'customer')
    'customer-context' = @('analysis', 'customer')
    'current-state' = @('analysis', 'customer', 'assessment')
    'future-state' = @('analysis', 'customer')
    'demo-fast-track' = @('demo')
    'project-delivery' = @('customer')
    'existing-solution' = @('assessment')
    'expert-consultation' = @('analysis')
}
if ($ProjectType -notin $allowedTypesByRoute[$EntryRoute]) {
    $allowedTypes = $allowedTypesByRoute[$EntryRoute] -join ', '
    throw "EntryRoute '$EntryRoute' is incompatible with ProjectType " +
        "'$ProjectType'. Allowed type(s): $allowedTypes."
}

$projectDisplayName = $DisplayName.Trim().Replace("`r", ' ').Replace("`n", ' ')
$projectDisplayName = $projectDisplayName.Replace('|', '\|')
$projectObjective = $Objective.Trim().Replace("`r", ' ').Replace("`n", ' ')
$projectObjective = $projectObjective.Replace('|', '\|')

Copy-Item -LiteralPath $templatePath -Destination $targetPath -Recurse

$projectFile = Join-Path $targetPath 'PROJECT.md'
$projectContent = Get-Content -Raw -Encoding utf8 -LiteralPath $projectFile
$projectReplacements = @{
    PROJECT_SLUG = $ProjectSlug
    DISPLAY_NAME = $projectDisplayName
    PROJECT_TYPE = $projectTypeLabel
    OBJECTIVE = $projectObjective
    ENTRY_ROUTE = $entryRouteLabels[$EntryRoute]
    DELIVERY_TRACK = $deliveryTrackLabels[$ProjectType]
    CURRENT_PHASE = $currentPhaseLabels[$EntryRoute]
    CREATED_DATE = (Get-Date -Format 'yyyy-MM-dd')
}
$projectContent = [regex]::Replace(
    $projectContent,
    '\{\{([A-Z_]+)\}\}',
    {
        param($match)
        $key = $match.Groups[1].Value
        if ($projectReplacements.ContainsKey($key)) {
            return [string]$projectReplacements[$key]
        }
        return $match.Value
    }
)
Set-Content -Encoding utf8 -LiteralPath $projectFile -Value $projectContent

$teamNotesFile = Join-Path $targetPath 'TEAM-NOTES.md'
$teamNotesContent = Get-Content -Raw -Encoding utf8 -LiteralPath $teamNotesFile
$teamNotesContent = $teamNotesContent.Replace(
    '{{DISPLAY_NAME}}',
    $projectDisplayName
)
Set-Content -Encoding utf8 -LiteralPath $teamNotesFile -Value $teamNotesContent

$stateManager = Join-Path $PSScriptRoot 'ke-project.mjs'
& node $stateManager bootstrap `
    --project $ProjectSlug `
    --type $ProjectType `
    --route $EntryRoute `
    --display-name $projectDisplayName `
    --objective $projectObjective
if ($LASTEXITCODE -ne 0) {
    throw "Failed to initialize project state for $ProjectSlug."
}
& node $stateManager use $ProjectSlug
if ($LASTEXITCODE -ne 0) {
    throw "Failed to activate project $ProjectSlug."
}

Write-Output "Created $ProjectType project workspace: $targetPath"
Write-Output "Input:  $(Join-Path $targetPath 'input')"
Write-Output "Analysis: $(Join-Path $targetPath 'analysis')"
Write-Output "Output: $(Join-Path $targetPath 'output')"
Write-Output "Team notes: $teamNotesFile"
