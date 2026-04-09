@echo off
setlocal enabledelayedexpansion

set "BIN_DIR=%~dp0bin"
set "YTDLP_URL=https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
set "FFMPEG_URL=https://github.com/yt-dlp/yt-dlp/releases/latest/download/ffmpeg.exe"

echo ============================================
echo   yt-dlp Setup for Windows
echo ============================================
echo.

if not exist "%BIN_DIR%" (
    echo Creating bin directory...
    mkdir "%BIN_DIR%"
)

where yt-dlp >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo yt-dlp is already installed on your PATH.
) else (
    echo.
    echo Downloading yt-dlp to %BIN_DIR%...
    powershell -Command "Invoke-WebRequest -Uri '%YTDLP_URL%' -OutFile '%BIN_DIR%\yt-dlp.exe'"
    if %ERRORLEVEL% EQU 0 (
        echo yt-dlp downloaded successfully!
    ) else (
        echo Failed to download yt-dlp.
    )
)

where ffmpeg >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ffmpeg is already installed on your PATH.
) else (
    echo.
    set /p INSTALL_FFMPEG="Download ffmpeg to bin/? (y/n): "
    if /i "!INSTALL_FFMPEG!"=="y" (
        echo Downloading ffmpeg...
        powershell -Command "Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%BIN_DIR%\ffmpeg.exe'"
        if %ERRORLEVEL% EQU 0 (
            echo ffmpeg downloaded successfully!
        ) else (
            echo Failed to download ffmpeg.
        )
    )
)

echo.
echo Setup complete! Binaries are in: %BIN_DIR%
echo.
pause
