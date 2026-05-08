import { startDrag } from "@crabnebula/tauri-plugin-drag";
import dragIcon from "../../src-tauri/icons/32x32.png?inline";

console.log("dragIcon type:", typeof dragIcon);
console.log("dragIcon preview:", dragIcon?.substring(0, 50));

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
//test
interface CurrentDownloadsProps {
  downloads: DownloadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onOpenFolder: (download: DownloadItem) => void;
  hasCompleted: boolean;
  onClearCompleted: () => void;
}

function getFilePath(download: DownloadItem): string {
  const cleanFolder = download.folderPath.replace(/[\\/]+$/, "");
  const sep = cleanFolder.includes("\\") ? "\\" : "/";
  return `${cleanFolder}${sep}${download.filename}`;
}

const DRAGGABLE_STATUSES = new Set(["complete"]);

const DRAG_THRESHOLD = 5;

export default function CurrentDownloads({ downloads, onPause, onResume, onOpenFolder, hasCompleted, onClearCompleted }: CurrentDownloadsProps) {
  const isEmpty = downloads.length === 0;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, download: DownloadItem) => {
    if (e.button !== 0) return;
    if (!DRAGGABLE_STATUSES.has(download.status)) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        hasMoved = true;
      }
    };

    const onMouseUp = async () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (!hasMoved) return;

      const filePath = getFilePath(download);
      try {
        await startDrag({
          item: [filePath],
          icon: `data:image/png;base64,${dragIcon}`,
          mode: "move",
        });
      } catch (err) {
        console.error("Drag failed:", err);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

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
          downloads.map((download) => {
            const isDraggable = DRAGGABLE_STATUSES.has(download.status);
            const fullPath = getFilePath(download);
            return (
              <div
                tabIndex={0}
                key={download.id}
                className={`download-item download-item-${download.status}${isDraggable ? " download-item-draggable" : ""}`}
                onDoubleClick={() => onOpenFolder(download)}
                onMouseDown={(e) => handleMouseDown(e, download)}
                title={fullPath}
              >
                <span className="download-item-filename" title={fullPath}>{download.filename}</span>
                <span className="download-item-progress">{download.progress}</span>
                <div className="download-item-btn-wrapper">
                  {download.status === "downloading" && (
                    <button className="download-item-pause download-item-btn" onClick={(e) => { e.stopPropagation(); onPause(download.id); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                          <path d="M2.25 0C1.01625 0 0 1.01625 0 2.25C0 2.25 0 16.75 0 16.75C0 17.9838 1.01625 19 2.25 19C2.25 19 4.75 19 4.75 19C5.98375 19 7 17.9838 7 16.75C7 16.75 7 2.25 7 2.25C7 1.01625 5.98375 0 4.75 0C4.75 0 2.25 0 2.25 0C2.25 0 2.25 0 2.25 0ZM13.25 0C12.0162 0 11 1.01625 11 2.25C11 2.25 11 16.75 11 16.75C11 17.9838 12.0162 19 13.25 19C13.25 19 15.75 19 15.75 19C16.9838 19 18 17.9838 18 16.75C18 16.75 18 2.25 18 2.25C18 1.01625 16.9838 0 15.75 0C15.75 0 13.25 0 13.25 0C13.25 0 13.25 0 13.25 0ZM2.25 1.5C2.25 1.5 4.75 1.5 4.75 1.5C5.17325 1.5 5.5 1.82675 5.5 2.25C5.5 2.25 5.5 16.75 5.5 16.75C5.5 17.1733 5.17325 17.5 4.75 17.5C4.75 17.5 2.25 17.5 2.25 17.5C1.82675 17.5 1.5 17.1733 1.5 16.75C1.5 16.75 1.5 2.25 1.5 2.25C1.5 1.82675 1.82675 1.5 2.25 1.5C2.25 1.5 2.25 1.5 2.25 1.5ZM13.25 1.5C13.25 1.5 15.75 1.5 15.75 1.5C16.1733 1.5 16.5 1.82675 16.5 2.25C16.5 2.25 16.5 16.75 16.5 16.75C16.5 17.1733 16.1733 17.5 15.75 17.5C15.75 17.5 13.25 17.5 13.25 17.5C12.8268 17.5 12.5 17.1733 12.5 16.75C12.5 16.75 12.5 2.25 12.5 2.25C12.5 1.82675 12.8268 1.5 13.25 1.5C13.25 1.5 13.25 1.5 13.25 1.5Z" 
                              fill="#000000" transform="translate(3 2.5)" />
                        </g>
                      </svg>
                    </button>
                  )}
                  {download.status === "paused" && (
                    <button className="download-item-resume download-item-btn" onClick={(e) => { e.stopPropagation(); onResume(download.id); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g>
                          <path d="M2.19824 0.001719C1.0521 0.0470643 0 0.982144 0 2.24195C0 2.24195 0 17.6502 0 17.6502C0 19.3299 1.87138 20.432 3.34082 19.6179C3.34082 19.6179 17.2451 11.9138 17.2451 11.9138C18.7568 11.0762 18.7568 8.81593 17.2451 7.97828C17.2451 7.97828 3.34082 0.27418 3.34082 0.27418C2.97346 0.0706623 2.58029 -0.013396 2.19824 0.001719C2.19824 0.001719 2.19824 0.001719 2.19824 0.001719ZM2.21582 1.47926C2.34512 1.4787 2.48064 1.51222 2.61328 1.5857C2.61328 1.5857 16.5186 9.2898 16.5186 9.2898C17.0678 9.59416 17.0678 10.2979 16.5186 10.6023C16.5186 10.6023 2.61328 18.3064 2.61328 18.3064C2.08272 18.6003 1.5 18.2564 1.5 17.6502C1.5 17.6502 1.5 2.24195 1.5 2.24195C1.5 1.93883 1.64535 1.70186 1.85742 1.57691C1.96346 1.51444 2.08652 1.47981 2.21582 1.47926C2.21582 1.47926 2.21582 1.47926 2.21582 1.47926Z" 
                              fill="#000000" transform="translate(3.5 2.054)" />
                        </g>
                      </svg>
                    </button>
                  )}
                  {download.status === "complete" && (
                    <button className="download-item-open download-item-btn" onClick={(e) => { e.stopPropagation(); onOpenFolder(download); }}>
                      <svg viewBox="0 0 48 48" width="14px" height="14px" fill="currentColor">
                        <path d="M 24 4 C 12.972 4 4 12.972 4 24 C 4 35.028 12.972 44 24 44 C 35.028 44 44 35.028 44 24 C 44 20.791 43.222047 17.767172 41.873047 15.076172 L 39.628906 17.320312 C 40.508906 19.371312 41 21.629 41 24 C 41 33.374 33.374 41 24 41 C 14.626 41 7 33.374 7 24 C 7 14.626 14.626 7 24 7 C 28.446 7 32.485578 8.7292031 35.517578 11.533203 L 37.638672 9.4121094 C 34.061672 6.0651094 29.273 4 24 4 z M 39.470703 10.986328 A 1.50015 1.50015 0 0 0 38.439453 11.439453 L 21.5 28.378906 L 17.560547 24.439453 A 1.50015 1.50015 0 1 0 15.439453 26.560547 L 20.439453 31.560547 A 1.50015 1.50015 0 0 0 22.560547 31.560547 L 40.560547 13.560547 A 1.50015 1.50015 0 0 0 39.470703 10.986328 z"/>
                      </svg>
                    </button>)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </div>
  );
}