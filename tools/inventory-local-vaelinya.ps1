param(
  [Parameter(Mandatory=$true)]
  [string]$Root,

  [string]$OutputFolder = "."
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Root)) {
  throw "Root folder does not exist: $Root"
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$inventoryPath = Join-Path $OutputFolder "vaelinya-local-file-inventory-$timestamp.csv"
$summaryPath = Join-Path $OutputFolder "vaelinya-local-folder-summary-$timestamp.txt"

$excludedFolderNames = @(
  "90_GitHub_Repos",
  "node_modules",
  ".git",
  "dist",
  ".astro",
  ".cache",
  ".vercel",
  ".netlify",
  "__pycache__"
)

$secretPatterns = @(
  "\.env$",
  "token",
  "secret",
  "password",
  "client_secret",
  "access_token",
  "refresh_token"
)

function Get-RelativePath {
  param(
    [string]$Base,
    [string]$Path
  )

  $baseUri = New-Object System.Uri(($Base.TrimEnd('\') + '\'))
  $pathUri = New-Object System.Uri($Path)
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '\')
}

$files = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Force |
  Where-Object {
    $full = $_.FullName
    $relative = Get-RelativePath -Base $resolvedRoot -Path $full
    $parts = $relative -split "[\\/]"
    -not ($parts | Where-Object { $excludedFolderNames -contains $_ })
  } |
  ForEach-Object {
    $relative = Get-RelativePath -Base $resolvedRoot -Path $_.FullName
    $lowerPath = $relative.ToLowerInvariant()
    $possibleSecret = $false

    foreach ($pattern in $secretPatterns) {
      if ($lowerPath -match $pattern) {
        $possibleSecret = $true
      }
    }

    $categoryGuess = "UNSORTED"
    $ext = $_.Extension.ToLowerInvariant()

    if ($possibleSecret) {
      $categoryGuess = "CHECK_SECRET_OR_PRIVATE"
    } elseif ($ext -in @(".md", ".txt", ".json", ".yaml", ".yml")) {
      $categoryGuess = "POSSIBLE_CANON_OR_TEXT"
    } elseif ($ext -in @(".astro", ".js", ".mjs", ".ts", ".tsx", ".css", ".html")) {
      $categoryGuess = "POSSIBLE_WEBSITE_OR_API"
    } elseif ($ext -in @(".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif")) {
      $categoryGuess = "IMAGE_OR_ASSET"
    } elseif ($ext -in @(".mp3", ".wav", ".flac", ".m4a")) {
      $categoryGuess = "AUDIO"
    } elseif ($ext -in @(".zip", ".7z", ".rar")) {
      $categoryGuess = "ARCHIVE"
    }

    [PSCustomObject]@{
      RelativePath = $relative
      FileName = $_.Name
      Extension = $ext
      SizeBytes = $_.Length
      SizeMB = [Math]::Round($_.Length / 1MB, 3)
      LastModified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
      CategoryGuess = $categoryGuess
      PossibleSecretOrPrivate = $possibleSecret
    }
  }

$files | Sort-Object RelativePath | Export-Csv -Path $inventoryPath -NoTypeInformation -Encoding UTF8

$totalFiles = $files.Count
$totalMB = [Math]::Round((($files | Measure-Object -Property SizeBytes -Sum).Sum / 1MB), 2)
$byExtension = $files | Group-Object Extension | Sort-Object Count -Descending | Select-Object Count, Name
$byCategory = $files | Group-Object CategoryGuess | Sort-Object Count -Descending | Select-Object Count, Name
$byTopFolder = $files |
  ForEach-Object {
    $top = ($_.RelativePath -split "[\\/]")[0]
    [PSCustomObject]@{ TopFolder = $top; SizeBytes = $_.SizeBytes }
  } |
  Group-Object TopFolder |
  ForEach-Object {
    [PSCustomObject]@{
      Files = $_.Count
      SizeMB = [Math]::Round((($_.Group | Measure-Object -Property SizeBytes -Sum).Sum / 1MB), 2)
      TopFolder = $_.Name
    }
  } |
  Sort-Object Files, SizeMB -Descending
$largeFiles = $files | Sort-Object SizeBytes -Descending | Select-Object -First 30 RelativePath, SizeMB, CategoryGuess
$possibleSecrets = $files | Where-Object { $_.PossibleSecretOrPrivate } | Select-Object RelativePath, CategoryGuess

$summary = @()
$summary += "Vaelinya local folder inventory"
$summary += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$summary += "Root: $resolvedRoot"
$summary += "Excluded folders: $($excludedFolderNames -join ', ')"
$summary += ""
$summary += "Totals"
$summary += "------"
$summary += "Files: $totalFiles"
$summary += "Total size MB: $totalMB"
$summary += ""
$summary += "By top folder"
$summary += "-------------"
$summary += ($byTopFolder | Format-Table -AutoSize | Out-String)
$summary += ""
$summary += "By category"
$summary += "-----------"
$summary += ($byCategory | Format-Table -AutoSize | Out-String)
$summary += ""
$summary += "By extension"
$summary += "------------"
$summary += ($byExtension | Format-Table -AutoSize | Out-String)
$summary += ""
$summary += "Largest files"
$summary += "-------------"
$summary += ($largeFiles | Format-Table -AutoSize | Out-String)
$summary += ""
$summary += "Possible secrets/private files"
$summary += "------------------------------"
if ($possibleSecrets.Count -gt 0) {
  $summary += ($possibleSecrets | Format-Table -AutoSize | Out-String)
} else {
  $summary += "None flagged by filename scan. This does not guarantee the contents are safe."
}

$summary -join "`r`n" | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host "Inventory written to: $inventoryPath"
Write-Host "Summary written to:   $summaryPath"
Write-Host ""
Write-Host "Next: review the summary before committing or uploading anything."
