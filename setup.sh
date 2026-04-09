#!/bin/bash

BIN_DIR="$(dirname "$0")/bin"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
FFMPEG_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/ffmpeg"

echo "============================================"
echo "  yt-dlp Setup for Linux/macOS"
echo "============================================"
echo ""

if [ ! -d "$BIN_DIR" ]; then
    echo "Creating bin directory..."
    mkdir -p "$BIN_DIR"
fi

if command -v yt-dlp &> /dev/null; then
    echo "yt-dlp is already installed on your PATH."
else
    echo ""
    echo "Downloading yt-dlp to $BIN_DIR..."
    if curl -L -o "$BIN_DIR/yt-dlp" "$YTDLP_URL"; then
        chmod +x "$BIN_DIR/yt-dlp"
        echo "yt-dlp downloaded successfully!"
    else
        echo "Failed to download yt-dlp."
    fi
fi

if command -v ffmpeg &> /dev/null; then
    echo "ffmpeg is already installed on your PATH."
else
    echo ""
    read -p "Download ffmpeg to bin/? (y/n): " INSTALL_FFMPEG
    if [ "$INSTALL_FFMPEG" = "y" ] || [ "$INSTALL_FFMPEG" = "Y" ]; then
        echo "Downloading ffmpeg..."
        if curl -L -o "$BIN_DIR/ffmpeg" "$FFMPEG_URL"; then
            chmod +x "$BIN_DIR/ffmpeg"
            echo "ffmpeg downloaded successfully!"
        else
            echo "Failed to download ffmpeg."
        fi
    fi
fi

echo ""
echo "Setup complete! Binaries are in: $BIN_DIR"
echo ""
