interface DownloadItem {
  id: string;
  filename: string;
  progress: string;
  status: "downloading" | "complete" | "error";
}

interface CurrentDownloadsProps {
  downloads: DownloadItem[];
}

export default function CurrentDownloads({ downloads }: CurrentDownloadsProps) {
  const isEmpty = downloads.length === 0;

  return (
    <div className="current-downloads">
      <div className="current-downloads-header">
        <span>Current Downloads</span>
      </div>
      <div className="current-downloads-content">
        {isEmpty ? (
          <div className="current-downloads-empty">No current downloads</div>
        ) : (
          downloads.map((download) => (
            <div key={download.id} className={`download-item download-item-${download.status}`}>
              <span className="download-item-filename" title={download.filename}>{download.filename}</span>
              <span className="download-item-progress">{download.progress}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
