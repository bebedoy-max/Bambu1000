@echo off
setlocal enabledelayedexpansion
title SuperIT Event Uploader - Installer (Windows)
cd /d "%~dp0"

echo ============================================
echo   SuperIT Event Uploader 1.2.3 - Installer
echo ============================================
echo.

set "PY="
where py >nul 2>&1
if %errorlevel%==0 (
  for %%V in (3.12 3.11 3.10) do (
    if not defined PY (
      py -%%V --version >nul 2>&1
      if !errorlevel!==0 set "PY=py -%%V"
    )
  )
)

if not defined PY (
  python --version >nul 2>&1
  if !errorlevel!==0 (
    for /f "tokens=2" %%A in ('python --version 2^>^&1') do set "PYVER=%%A"
    for /f "tokens=1,2 delims=." %%A in ("!PYVER!") do (
      if "%%A"=="3" (
        if %%B GEQ 10 if %%B LEQ 12 set "PY=python"
      )
    )
  )
)

if not defined PY (
  echo [X] Python 3.10 - 3.12 tidak ditemukan.
  echo     Versi Python 3.13/3.14 BELUM didukung oleh insightface/onnxruntime.
  echo     Unduh Python 3.12 di https://www.python.org/downloads/release/python-3128/
  echo     Centang "Add python.exe to PATH" saat instalasi, lalu jalankan lagi file ini.
  pause
  exit /b 1
)

echo Menggunakan: %PY%
%PY% --version

set "APPDIR=%LOCALAPPDATA%\SuperITEventUploader"
echo [1/4] Menyalin file ke %APPDIR% ...
if exist "%APPDIR%" rmdir /S /Q "%APPDIR%"
mkdir "%APPDIR%"
xcopy /E /I /Y /Q "%~dp0app\*" "%APPDIR%\" >nul

echo [2/4] Membuat virtual environment ...
if exist "%APPDIR%\.venv" rmdir /S /Q "%APPDIR%\.venv"
%PY% -m venv "%APPDIR%\.venv" || (echo [X] Gagal membuat venv & pause & exit /b 1)

echo [3/4] Memasang dependensi (butuh internet, +- 5 menit) ...
set "PIP_CACHE_DIR=%APPDIR%\.pipcache"
"%APPDIR%\.venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel >nul
"%APPDIR%\.venv\Scripts\python.exe" -m pip install --no-cache-dir -r "%APPDIR%\requirements.txt"
if errorlevel 1 (
  echo.
  echo [!] Percobaan pertama gagal, mencoba ulang tanpa cache pip bawaan ...
  "%APPDIR%\.venv\Scripts\python.exe" -m pip install --no-cache-dir --force-reinstall -r "%APPDIR%\requirements.txt" || (
    echo [X] Gagal memasang dependensi.
    echo     Tips: tutup antivirus/OneDrive sementara, atau jalankan file ini sebagai Administrator.
    pause
    exit /b 1
  )
)

echo [4/4] Membuat shortcut di Desktop ...
> "%APPDIR%\SuperITEventUploader.bat" echo @echo off
>> "%APPDIR%\SuperITEventUploader.bat" echo cd /d "%APPDIR%"
>> "%APPDIR%\SuperITEventUploader.bat" echo "%APPDIR%\.venv\Scripts\pythonw.exe" run.py

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\SuperIT Event Uploader.lnk');" ^
  "$s.TargetPath='%APPDIR%\SuperITEventUploader.bat'; $s.WorkingDirectory='%APPDIR%'; $s.Save()"

echo.
echo [OK] Instalasi selesai. Buka "SuperIT Event Uploader" dari Desktop.
pause
