# YTDapper — Audio/Video Downloader Interface

This app uses `yt-dlp`. If you don't have it installed system-wide, run the provided setup scripts. 

## Setup
- **Windows:** Run [setup.bat](setup.bat) or install manually: `winget install yt-dlp`.
## Download

| Platform | Installer |
|----------|-----------|
| Windows  | [YTDapper_1.0.0_x64-setup.exe](https://github.com/yourusername/ytdapper/releases/latest) (NSIS) |
| Windows  | [YTDapper_1.0.0_x64.msi](https://github.com/yourusername/ytdapper/releases/latest) (MSI) |

\
\
\
\
\
\
FAQ: \
Where does winget install the exe?

For standalone portable tools like yt-dlp, winget drops the actual .exe file into an isolated subfolder inside your user profile: \
C:\Users\<YourUsername>\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.yt-dlp\ \
\
You do not need to add that complex folder to your environment variables. \
Instead, WinGet maintains a single centralized folder that is already globally connected to your system's PATH: \
C:\Users\<YourUsername>\AppData\Local\Microsoft\WinGet\Links 
