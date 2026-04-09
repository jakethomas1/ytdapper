import { useState, useEffect } from "react";
import { downloadDir } from "@tauri-apps/api/path";

interface DestinationComponentProps {
  destination: string;
  folderPath: string;
  onPickFolder: () => void;
  onFolderChange: (path: string, name: string) => void;
}

export default function DestinationComponent({
  destination,
  folderPath,
  onPickFolder,
  onFolderChange,
}: DestinationComponentProps) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initDefaultFolder() {
      if (!folderPath && !initialized) {
        try {
          const downloadsPath = await downloadDir();
          const parts = downloadsPath.split(/[/\\]/);
          const folderName = parts[parts.length - 1] || "Downloads";
          onFolderChange(downloadsPath, folderName);
        } catch (e) {
          console.error("Failed to get downloads directory:", e);
        }
        setInitialized(true);
      }
    }
    initDefaultFolder();
  }, [folderPath, initialized, onFolderChange]);

  return (
    <div className="input-row">
      <span className="row-label">Destination:</span>
      <div className="selection-menu" onClick={onPickFolder}>
        <span>{destination}</span>
        <div className="triangle"></div>
      </div>
      <div className="separator"></div>
      <span className="folder-path">{folderPath || "No folder selected"}</span>
    </div>
  );
}
