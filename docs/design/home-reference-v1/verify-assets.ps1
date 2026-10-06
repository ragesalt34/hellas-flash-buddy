$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$kitPath = Join-Path $repoRoot 'telegram-bot/webapp/public/assets/pureplay/home-reference-v1'
$encoderPath = 'C:\Users\user\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe'
if (!(Test-Path -LiteralPath $encoderPath)) { throw 'Bundled/local ffmpeg not found.' }
$assetNames = @('hero', 'quiz', 'flashcards', 'vocab', 'homework', 'acropolis', 'olive')
$assets = foreach ($assetName in $assetNames) {
  $pngPath = Join-Path $kitPath ($assetName + '.png')
  $webpPath = Join-Path $kitPath ($assetName + '.webp')
  $bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
  try {
    $width = $bitmap.Width
    $height = $bitmap.Height
    if ($width -lt 1000 -and $height -lt 1000) { throw "$assetName has insufficient resolution." }
    $transparentSamples = 0
    $visibleSamples = 0
    $solidSamples = 0
    for ($y=0; $y -lt $height; $y+=16) {
      for ($x=0; $x -lt $width; $x+=16) {
        $alpha = $bitmap.GetPixel($x,$y).A
        if ($alpha -eq 0) { $transparentSamples++ }
        if ($alpha -gt 0) { $visibleSamples++ }
        if ($alpha -eq 255) { $solidSamples++ }
      }
    }
    if ($visibleSamples -eq 0) { throw "$assetName is empty." }
    if ($assetName -ne 'hero' -and $transparentSamples -eq 0) { throw "$assetName has no transparency." }
    if ($assetName -eq 'hero' -and $transparentSamples -gt 0) { throw 'Hero must have opaque paper background.' }
  } finally { $bitmap.Dispose() }
  if (!(Test-Path -LiteralPath $webpPath)) {
    & $encoderPath -hide_banner -loglevel error -n -i $pngPath -c:v libwebp -lossless 1 -compression_level 6 $webpPath
    if ($LASTEXITCODE -ne 0) { throw "Encoding failed: $assetName" }
  }
  & $encoderPath -hide_banner -loglevel error -i $webpPath -f null -
  if ($LASTEXITCODE -ne 0) { throw "Decoding failed: $assetName" }
  [ordered]@{
    id=$assetName; png=($assetName+'.png'); webp=($assetName+'.webp')
    width=$width; height=$height
    transparent=($assetName -ne 'hero')
    encoding='lossless WebP; original PNG preserved'
    pngBytes=(Get-Item -LiteralPath $pngPath).Length
    webpBytes=(Get-Item -LiteralPath $webpPath).Length
    sha256=(Get-FileHash -LiteralPath $pngPath -Algorithm SHA256).Hash.ToLowerInvariant()
    alphaSample=[ordered]@{step=16;transparent=$transparentSamples;visible=$visibleSamples;opaque=$solidSamples}
  }
}
$svgNames = @('book-open','streak','accuracy','tests','sound','arrow-right','help','progress')
foreach ($svgName in $svgNames) {
  $svgPath = Join-Path $kitPath ('icons/' + $svgName + '.svg')
  $svg = [xml](Get-Content -LiteralPath $svgPath -Raw)
  if ($svg.DocumentElement.LocalName -ne 'svg') { throw "Invalid SVG: $svgName" }
}
$manifest = [ordered]@{
  schemaVersion=1
  reference='approved-reference.png'
  status='prepared; not integrated into application'
  sourceTool='built-in image_gen'
  prompts='../../../../../../docs/design/home-reference-v1/prompts.json'
  assets=@($assets)
  icons=@($svgNames | ForEach-Object { 'icons/' + $_ + '.svg' })
  tokens='tokens.json'
  elements='elements.css'
  verification='PNG dimensions and alpha sampling; WebP decoding; SVG XML; SHA-256'
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $kitPath 'manifest.json') -Encoding UTF8
$assets | ForEach-Object { '{0}: {1}x{2}, alpha={3}, WebP {4:N0} bytes' -f $_.id,$_.width,$_.height,$_.transparent,$_.webpBytes }
'Verified 7 images and 8 SVG icons.'
