



# YTDapper — Audio/Video Downloader Interface

This app uses `yt-dlp`. If you don't have it installed system-wide, run the provided setup scripts. 
<br>

## Setup
- **Windows:** Run [setup.bat](setup.bat) or install manually by pasting this into your terminal:

```bat
winget install yt-dlp
```

## Download

| Platform | Installer | Type
|----------|-----------|-----------|
| Windows  | [YTDapper_1.0.0_x64-setup.exe](https://github.com/jakethomas1/ytdapper/releases/latest) | (NSIS) |
| Windows  | [YTDapper_1.0.0_x64.msi](https://github.com/jakethomas1/ytdapper/releases/latest) | (MSI) |
| Debian/Ubuntu    | [YTDapper_1.0.0_amd64.deb](https://github.com/jakethomas1/ytdapper/releases/latest) | (apt / dpkg) |
| Linux (All distros)     | [YTDapper_1.0.0_amd64.AppImage](https://github.com/jakethomas1/ytdapper/releases/latest) | (AppImage) |
| Fedora/Red Hat    | [YTDapper_1.0.0-1.x86_64.rpm](https://github.com/jakethomas1/ytdapper/releases/latest) | (dnf / yum / rpm) |

<br>
<br>

https://github.com/user-attachments/assets/eacedf3f-ef92-4b64-a40b-df7ec2307b22

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
