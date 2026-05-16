# YTDapper — Video Downloader Interface

This app uses `yt-dlp` for video downloading. If you don't have it installed system-wide, run the provided setup scripts. 

- **Windows:** Run `setup.bat`
- **Linux/macOS:** Run `setup.sh`

\
\
Note: The windows setup script is 1-line 'winget install yt-dlp': 

Key Benefits of Winget Installation: \
Automatic Path Management: Unlike a manual download, winget adds the executable location to your user environment variables so you can run yt-dlp from any folder. \
Dependencies: It automatically installs FFmpeg, which is required for high-quality video merging and audio extraction. 

FAQ: \
Where does winget install the exe?

For standalone portable tools like yt-dlp, winget drops the actual .exe file into an isolated subfolder inside your user profile: \
C:\Users\<YourUsername>\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.yt-dlp\ \
\
You do not need to add that complex folder to your environment variables. \
Instead, WinGet maintains a single centralized folder that is already globally connected to your system's PATH: \
C:\Users\<YourUsername>\AppData\Local\Microsoft\WinGet\Links 
