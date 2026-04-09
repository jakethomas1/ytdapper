import { useState, useRef, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import DestinationComponent from "./Components/DestinationComponent";
import InputLinkComponent from "./Components/InputLinkComponent";
import CurrentDownloads from "./Components/CurrentDownloads";
import "./App.css";

function App() {
  const [destination, setDestination] = useState<string>("Downloads");
  const [folderPath, setFolderPath] = useState<string>("");
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string>("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);
  const [downloads] = useState<{id: string; filename: string; progress: string; status: "downloading" | "complete" | "error"}[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const logPreviewRef = useRef<HTMLPreElement>(null);
  const rafScheduledRef = useRef(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const store = await load("settings.json", { autoSave: 300, defaults: {} });
        const savedFolderPath = await store.get<string>("folderPath");
        const savedFolderName = await store.get<string>("folderName");
        const savedQuality = await store.get<string>("quality");

        if (savedFolderPath) setFolderPath(savedFolderPath);
        if (savedFolderName) setDestination(savedFolderName);
        if (savedQuality) setQuality(savedQuality);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    }
    loadSettings();
  }, []);

  async function saveSettings(folder: string, folderName: string, qual: string) {
    try {
      const store = await load("settings.json", { autoSave: 300, defaults: {} });
      await store.set("folderPath", folder);
      await store.set("folderName", folderName);
      await store.set("quality", qual);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  async function pickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Download Folder",
    });

    if (selected && typeof selected === "string") {
      const parts = selected.split(/[/\\]/);
      const folderName = parts[parts.length - 1];
      setDestination(folderName);
      setFolderPath(selected);
      saveSettings(selected, folderName, quality);
    }
  }

  async function handleDownload() {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    if (!folderPath) {
      setError("Please select a destination folder");
      return;
    }

    setError("");
    setLogLines([]);
    setLogFilePath(null);
    setIsDownloading(true);

    const unlisten = await listen<string>("yt-dlp-output", (event) => {
      setLogLines((prev) => {
        const newLines = [...prev.slice(-20), event.payload];
        
        if (!rafScheduledRef.current) {
          rafScheduledRef.current = true;
          requestAnimationFrame(() => {
            if (logPreviewRef.current) {
              logPreviewRef.current.scrollTop = logPreviewRef.current.scrollHeight;
            }
            rafScheduledRef.current = false;
          });
        }
        
        return newLines;
      });
    });
    unlistenRef.current = unlisten;

    try {
      const result = await invoke<string>("download_video", {
        url: url,
        quality: quality,
        outputDir: folderPath,
      });
      setLogFilePath(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsDownloading(false);
      unlisten();
      unlistenRef.current = null;
    }
  }

  async function openLogFile() {
    if (logFilePath) {
      try {
        await invoke("open_in_default_app", { path: logFilePath });
      } catch (e) {
        setError(`Failed to open log: ${e}`);
      }
    }
  }

  return (
    <div className="app-container">
      <DestinationComponent
        destination={destination}
        folderPath={folderPath}
        onPickFolder={pickFolder}
        onFolderChange={(path, name) => {
          setFolderPath(path);
          setDestination(name);
          saveSettings(path, name, quality);
        }}
      />

      <InputLinkComponent
        url={url}
        quality={quality}
        error={error}
        onUrlChange={setUrl}
        onQualityChange={(q) => {
          setQuality(q);
          saveSettings(folderPath, destination, q);
        }}
        onDownload={handleDownload}
      />

      {isDownloading && <span className="status-text">Downloading...</span>}
      {logLines.length > 0 && (
        <div className="log-preview">
          <div className="log-preview-header">
            <span>Output Preview</span>
            {!isDownloading && logFilePath && (
              <button className="log-preview-open" onClick={openLogFile}>Open Full Log</button>
            )}
          </div>
          <pre className="log-preview-content" ref={logPreviewRef}>
            {logLines.slice(-4).join("\n")}
          </pre>
        </div>
      )}

      <CurrentDownloads downloads={downloads} />
    </div>
  );
}

export default App;
