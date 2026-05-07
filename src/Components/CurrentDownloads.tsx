interface DownloadItem {
  id: string;
  filename: string;
  progress: string;
  status: "downloading" | "complete" | "error" | "cancelled" | "paused";
  folderPath: string;
  url: string;
  quality: string;
  isAudioOnly: boolean;
}

interface CurrentDownloadsProps {
  downloads: DownloadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onOpenFolder: (download: DownloadItem) => void;
  hasCompleted: boolean;
  onClearCompleted: () => void;
}

export default function CurrentDownloads({ downloads, onPause, onResume, onOpenFolder, hasCompleted, onClearCompleted }: CurrentDownloadsProps) {
  const isEmpty = downloads.length === 0;

  return (
    <div className="current-downloads-component">
      <div className={`clear-dl-container ${hasCompleted ? "" : "hidden"}`}>
        <div className="clear-dl-btn" onClick={onClearCompleted}>Clear</div>
      </div>
    <div className="current-downloads">
      
      <div className="current-downloads-content">
        {isEmpty ? (
          <div className="current-downloads-empty">No current downloads</div>
        ) : (
          downloads.map((download) => (
            <div tabIndex={0} key={download.id} className={`download-item download-item-${download.status}`} onDoubleClick={() => onOpenFolder(download)}>
              <span className="download-item-filename" title={`${download.folderPath}${download.folderPath.includes('\\') ? '\\' : '/'}${download.filename}`}>{download.filename}</span>
              <button
                className="download-item-folder"
                onClick={() => onOpenFolder(download)}
                title="Open file location"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
              </button>
              <span className="download-item-progress">{download.progress}</span>
              <div className="download-item-btn-wrapper">
                {download.status === "downloading" && (
                  <button className="download-item-pause download-item-btn" onClick={() => onPause(download.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M2.25 0C1.01625 0 0 1.01625 0 2.25C0 2.25 0 16.75 0 16.75C0 17.9838 1.01625 19 2.25 19C2.25 19 4.75 19 4.75 19C5.98375 19 7 17.9838 7 16.75C7 16.75 7 2.25 7 2.25C7 1.01625 5.98375 0 4.75 0C4.75 0 2.25 0 2.25 0C2.25 0 2.25 0 2.25 0ZM13.25 0C12.0162 0 11 1.01625 11 2.25C11 2.25 11 16.75 11 16.75C11 17.9838 12.0162 19 13.25 19C13.25 19 15.75 19 15.75 19C16.9838 19 18 17.9838 18 16.75C18 16.75 18 2.25 18 2.25C18 1.01625 16.9838 0 15.75 0C15.75 0 13.25 0 13.25 0C13.25 0 13.25 0 13.25 0ZM2.25 1.5C2.25 1.5 4.75 1.5 4.75 1.5C5.17325 1.5 5.5 1.82675 5.5 2.25C5.5 2.25 5.5 16.75 5.5 16.75C5.5 17.1733 5.17325 17.5 4.75 17.5C4.75 17.5 2.25 17.5 2.25 17.5C1.82675 17.5 1.5 17.1733 1.5 16.75C1.5 16.75 1.5 2.25 1.5 2.25C1.5 1.82675 1.82675 1.5 2.25 1.5C2.25 1.5 2.25 1.5 2.25 1.5ZM13.25 1.5C13.25 1.5 15.75 1.5 15.75 1.5C16.1733 1.5 16.5 1.82675 16.5 2.25C16.5 2.25 16.5 16.75 16.5 16.75C16.5 17.1733 16.1733 17.5 15.75 17.5C15.75 17.5 13.25 17.5 13.25 17.5C12.8268 17.5 12.5 17.1733 12.5 16.75C12.5 16.75 12.5 2.25 12.5 2.25C12.5 1.82675 12.8268 1.5 13.25 1.5C13.25 1.5 13.25 1.5 13.25 1.5Z" 
                          fill="#000000" transform="translate(3 2.5)" />
                      </g>
                    </svg>
                  </button>
                )}
                {download.status === "paused" && (
                  <button className="download-item-resume download-item-btn" onClick={() => onResume(download.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M2.19824 0.001719C1.0521 0.0470643 0 0.982144 0 2.24195C0 2.24195 0 17.6502 0 17.6502C0 19.3299 1.87138 20.432 3.34082 19.6179C3.34082 19.6179 17.2451 11.9138 17.2451 11.9138C18.7568 11.0762 18.7568 8.81593 17.2451 7.97828C17.2451 7.97828 3.34082 0.27418 3.34082 0.27418C2.97346 0.0706623 2.58029 -0.013396 2.19824 0.001719C2.19824 0.001719 2.19824 0.001719 2.19824 0.001719ZM2.21582 1.47926C2.34512 1.4787 2.48064 1.51222 2.61328 1.5857C2.61328 1.5857 16.5186 9.2898 16.5186 9.2898C17.0678 9.59416 17.0678 10.2979 16.5186 10.6023C16.5186 10.6023 2.61328 18.3064 2.61328 18.3064C2.08272 18.6003 1.5 18.2564 1.5 17.6502C1.5 17.6502 1.5 2.24195 1.5 2.24195C1.5 1.93883 1.64535 1.70186 1.85742 1.57691C1.96346 1.51444 2.08652 1.47981 2.21582 1.47926C2.21582 1.47926 2.21582 1.47926 2.21582 1.47926Z" 
                          fill="#000000" transform="translate(3.5 2.054)" />
                      </g>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
