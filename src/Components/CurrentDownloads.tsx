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
            <div key={download.id} className={`download-item download-item-${download.status}`}>
              <span className="download-item-filename" title={download.filename}>{download.filename}</span>
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
              {download.status === "downloading" && (
                <button className="download-item-pause" onClick={() => onPause(download.id)}>Pause</button>
              )}
              {download.status === "paused" && (
                <button className="download-item-resume" onClick={() => onResume(download.id)}>Resume</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
