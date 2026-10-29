# =====================================================================
#  ROUTER ระบบขอลาพนักงาน - PWA Icon Generator
#  สร้างไอคอนแอปจากสีธีมของระบบ (gradient #0284c7 -> #082f49)
#  วิธีใช้: powershell -ExecutionPolicy Bypass -File make-icons.ps1
# =====================================================================
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Brand = [System.Drawing.Color]::FromArgb(255, 2, 132, 199)   # #0284c7 (sky-600)
$BrandDark = [System.Drawing.Color]::FromArgb(255, 8, 47, 73) # #082f49 (router-900)
$White = [System.Drawing.Brushes]::White

function New-BrandIcon {
  param(
    [int]$Size,
    [string]$OutFile,
    # "rounded" = มุมโค้งโปร่งใส (สำหรับ desktop/taskbar)
    # "full" = เต็มสี่เหลี่ยม (สำหรับ maskable / apple-touch-icon ที่ OS จะแต่งขอบเอง)
    [ValidateSet('rounded','full')][string]$Style,
    [double]$LetterScale = 0.56
  )
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.PixelOffsetMode = 'HighQuality'
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, $Size)),
    (New-Object System.Drawing.Point($Size, 0)),
    $Brand, $BrandDark)

  if ($Style -eq 'full') {
    $g.FillRectangle($grad, 0, 0, $Size, $Size)
  } else {
    $radius = [double]($Size * 0.20)
    $d = $radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($grad, $path)
    $path.Dispose()
  }

  $font = New-Object System.Drawing.Font('Segoe UI', [float]($Size * $LetterScale), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(0, ($Size * 0.02), $Size, $Size)
  $g.DrawString('R', $font, $White, $rect, $fmt)
  $fmt.Dispose(); $font.Dispose(); $grad.Dispose(); $g.Dispose()

  $fullPath = Join-Path $ProjectRoot $OutFile
  $bmp.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host ("OK  {0}  ({1}x{1})" -f $OutFile, $Size)
}

# --- generate ---
New-BrandIcon -Size 192  -OutFile 'icons\icon-192.png'          -Style rounded -LetterScale 0.56
New-BrandIcon -Size 512  -OutFile 'icons\icon-512.png'          -Style rounded -LetterScale 0.56
New-BrandIcon -Size 512  -OutFile 'icons\icon-maskable-512.png' -Style full    -LetterScale 0.44
New-BrandIcon -Size 180  -OutFile 'icons\icon-180.png'          -Style full    -LetterScale 0.52

Write-Host 'Done — ไอคอน PWA สร้างครบแล้วในโฟลเดอร์ icons\'
