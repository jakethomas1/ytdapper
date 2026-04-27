import { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { load } from "@tauri-apps/plugin-store";
import DestinationComponent from "./Components/DestinationComponent";
import InputLinkComponent, { type InputLinkRef } from "./Components/InputLinkComponent";
import CurrentDownloads from "./Components/CurrentDownloads";
import RightClickMenu from "./Components/RightClickMenu";
import "./App.css";

interface DownloadItem {
  id: string;
  filename: string;
  progress: string;
  status: "downloading" | "complete" | "error" | "cancelled";
  folderPath: string;
}

function App() {
  const [destination, setDestination] = useState<string>("Downloads");
  const [folderPath, setFolderPath] = useState<string>("");
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [error, setError] = useState<string>("");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const unlistenOutputRef = useRef<UnlistenFn | null>(null);
  const unlistenCompleteRef = useRef<UnlistenFn | null>(null);
  const inputLinkRef = useRef<InputLinkRef>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const store = await load("settings.json", { autoSave: 300, defaults: {} });
        const savedFolderPath = await store.get<string>("folderPath");
        const savedFolderName = await store.get<string>("folderName");
        const savedQuality = await store.get<string>("quality");
        const savedAlwaysOnTop = await store.get<boolean>("alwaysOnTop");

        if (savedFolderPath) setFolderPath(savedFolderPath);
        if (savedFolderName) setDestination(savedFolderName);
        if (savedQuality) setQuality(savedQuality);
        if (savedAlwaysOnTop !== undefined) setAlwaysOnTop(savedAlwaysOnTop);
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    }
    loadSettings();

    async function setupListeners() {
      unlistenOutputRef.current = await listen<[string, string]>("yt-dlp-output", (event) => {
        const [downloadId, line] = event.payload;
        console.log("yt-dlp-output event:", downloadId, line);
        const parsed = parseDownloadOutput(line, isAudioOnly);

        setDownloads((prev) =>
          prev.map((d) => {
            if (d.id === downloadId) {
              return {
                ...d,
                filename: parsed.filename || d.filename,
                progress: parsed.progress || d.progress,
              };
            }
            return d;
          })
        );
      });

      unlistenCompleteRef.current = await listen<[string, string, string]>("yt-dlp-complete", (event) => {
        const [downloadId, status, message] = event.payload;
        console.log("yt-dlp-complete event:", downloadId, status, message);

        setDownloads((prev) =>
          prev.map((d) => {
            if (d.id === downloadId) {
              if (status === "complete") {
                return { ...d, status: "complete", progress: "100%" };
              } else if (status === "error") {
                setError(message);
                return { ...d, status: "error" };
              }
            }
            return d;
          })
        );
      });
    }
    setupListeners();

    return () => {
      unlistenOutputRef.current?.();
      unlistenCompleteRef.current?.();
    };
  }, [isAudioOnly]);

  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    appWindow.setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);

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

  function parseDownloadOutput(line: string, audioOnly: boolean): { filename?: string; progress?: string } {
    const result: { filename?: string; progress?: string } = {};

    const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      result.progress = progressMatch[1] + "%";
    }

    const filenameMatch = line.match(/\[download\]\s*Destination:\s*(.+)/);
    const fullPath = filenameMatch?.[1] ?? ""
    let fileName = fullPath.split(/[\\/]/).pop() ?? ""
    if (audioOnly && fileName) {
      fileName = fileName.replace(/\.[^.]+$/, ".mp3"); 
    }
    if (filenameMatch) {
      result.filename = fileName;
    }

    return result;
  }

  async function handleDownload() {
    const urls = url.split('\n').filter(u => u.trim());
    
    if (urls.length === 0) {
      setError("Please enter a URL");
      return;
    }
    if (!folderPath) {
      setError("Please select a destination folder");
      return;
    }

    setError("");

    for (const urlStr of urls) {
      const downloadId = await invoke<string>("download_video", {
        url: urlStr.trim(),
        quality: quality,
        outputDir: folderPath,
        isAudioOnly: isAudioOnly,
      });

      const newDownload: DownloadItem = {
        id: downloadId,
        filename: "Starting...",
        progress: "0%",
        status: "downloading",
        folderPath: folderPath,
      };

      setDownloads((prev) => [newDownload, ...prev]);
    }
    
    inputLinkRef.current?.clear();
  }

  async function handleCancel(downloadId: string) {
    try {
      await invoke("cancel_download", { downloadId });
      setDownloads((prev) =>
        prev.map((d) => (d.id === downloadId ? { ...d, status: "cancelled" } : d))
      );
    } catch (e) {
      console.error("Failed to cancel download:", e);
    }
  }

  function handleOpenFolder(download: DownloadItem) {
    const fullPath = download.folderPath + "\\" + download.filename;
    invoke("open_in_default_app", { path: fullPath }).catch((e) => {
      console.error("Failed to open folder:", e);
    });
  }

  return (
    <div
      className="app-container"
      onContextMenu={async (e) => {
        e.preventDefault();
        await emit("contextmenu", { x: e.clientX, y: e.clientY });
      }}
    >
      <RightClickMenu alwaysOnTop={alwaysOnTop} setAlwaysOnTop={setAlwaysOnTop} />
      <DestinationComponent
        destination={destination}
        folderPath={folderPath}
        onPickFolder={pickFolder}
        onFolderChange={(path, name) => {
          setFolderPath(path);
          setDestination(name);
        }}
      />
      <InputLinkComponent
        ref={inputLinkRef}
        quality={quality}
        isAudioOnly={isAudioOnly}
        error={error}
        onUrlChange={setUrl}
        onQualityChange={(newQuality) => {
          setQuality(newQuality);
          saveSettings(folderPath, destination, newQuality);
        }}
        onAudioOnlyChange={(value) => {
          setIsAudioOnly(value);
          if (value) {
            setQuality("720");
          }
        }}
        onDownload={handleDownload}
      />
      <CurrentDownloads downloads={downloads} onCancel={handleCancel} onOpenFolder={handleOpenFolder} />
    </div>
  );
}

export default App;