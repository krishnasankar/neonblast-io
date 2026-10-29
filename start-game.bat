@echo off
title NeonBlast.io Local Server
echo ========================================================
echo   NEONBLAST.IO - Cyber Tank Arena
echo ========================================================
echo   Starting local server at http://localhost:8000 ...
echo   (Press Ctrl+C to stop)
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $port = 8000; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); $listener.Start(); Start-Process ('http://localhost:' + $port + '/'); while ($listener.IsListening) { $ctx = $listener.GetContext(); $req = $ctx.Request.Url.LocalPath.TrimStart('/'); if ($req -eq '') { $req = 'index.html' }; $path = Join-Path $PWD $req; if (Test-Path $path -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($path); if ($path.EndsWith('.html')) { $ctx.Response.ContentType = 'text/html; charset=utf-8' } elseif ($path.EndsWith('.js')) { $ctx.Response.ContentType = 'application/javascript; charset=utf-8' } elseif ($path.EndsWith('.css')) { $ctx.Response.ContentType = 'text/css; charset=utf-8' }; $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length); $ctx.Response.OutputStream.Close() } else { $ctx.Response.StatusCode = 404; $ctx.Response.OutputStream.Close() } } }"
