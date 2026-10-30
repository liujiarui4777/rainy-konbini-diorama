# 构建：把 src 打包成单文件 HTML（可直接双击打开，无需服务器）
$ErrorActionPreference = 'Stop'
$root = 'D:\User_Data\Desktop\3D'
$esbuild = 'D:\User_Data\Desktop\重庆大学3D项目\cqu-3d\node_modules\@esbuild\win32-x64\esbuild.exe'

New-Item -ItemType Directory -Force -Path "$root\dist" | Out-Null

& $esbuild "$root\src\main.js" --bundle --format=iife --target=chrome100 --outfile="$root\dist\app.js" --log-level=warning
if ($LASTEXITCODE -ne 0) { throw "esbuild 失败" }

$js = Get-Content "$root\dist\app.js" -Raw -Encoding UTF8
$tpl = Get-Content "$root\src\index.template.html" -Raw -Encoding UTF8
$html = $tpl.Replace('/*BUNDLE*/', $js)

$out1 = "$root\dist\index.html"
$out2 = "$root\雨夜便利店街角.html"
Set-Content -Path $out1 -Value $html -Encoding UTF8 -NoNewline
Set-Content -Path $out2 -Value $html -Encoding UTF8 -NoNewline

$size = [math]::Round((Get-Item $out2).Length / 1KB, 1)
Write-Host "构建完成: $out2 ($size KB)"
