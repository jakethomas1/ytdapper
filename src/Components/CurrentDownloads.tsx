interface DownloadItem {
  id: string;
  filename: string;
  progress: string;
  status: "downloading" | "complete" | "error" | "cancelled";
}

interface CurrentDownloadsProps {
  downloads: DownloadItem[];
  onCancel: (id: string) => void;
}

export default function CurrentDownloads({ downloads, onCancel }: CurrentDownloadsProps) {
  const isEmpty = downloads.length === 0;

  return (
    <div className="current-downloads">
      <div className="current-downloads-content">
        {isEmpty ? (
          <div className="current-downloads-empty">No current downloads</div>
        ) : (
          downloads.map((download) => (
            <div key={download.id} className={`download-item download-item-${download.status}`}>
              <span className="download-item-filename" title={download.filename}>{download.filename}</span>
              <span className="download-item-progress">{download.progress}</span>
              {download.status === "downloading" && (
                <button className="download-item-cancel" onClick={() => onCancel(download.id)}>Cancel</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
