import { useState, useRef, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import DestinationComponent from "./Components/DestinationComponent";
import InputLinkComponent from "./Components/InputLinkComponent";
import CurrentDownloads from "./Components/CurrentDownloads";
import "./App.css";

interface DownloadItem {
  id: string;
  filename: string;
  progress: string;
  status: "downloading" | "complete" | "error";
}

function App() {
  const [destination, setDestination] = useState<string>("Downloads");
  const [folderPath, setFolderPath] = useState<string>("");
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [error, setError] = useState<string>("");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);

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

  function parseDownloadOutput(line: string): { filename?: string; progress?: string } {
    const result: { filename?: string; progress?: string } = {};

    const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      result.progress = progressMatch[1] + "%";
    }

    const filenameMatch = line.match(/\[download\]\s*Destination:\s*(.+)/);
    const fullPath = filenameMatch?.[1] ?? ""
    const fileName = fullPath.split(/[\\/]/).pop() ?? ""
    if (filenameMatch) {
      result.filename = fileName ;
    }

    console.log("parseDownloadOutput:", { line: line.slice(0, 50), result });

    return result;
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

    const downloadId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newDownload: DownloadItem = {
      id: downloadId,
      filename: "Starting...",
      progress: "0%",
      status: "downloading",
    };

    setDownloads((prev) => [...prev, newDownload]);

    const unlisten = await listen<string>("yt-dlp-output", (event) => {
      console.log("yt-dlp-output event:", event.payload);
      const parsed = parseDownloadOutput(event.payload);

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
    unlistenRef.current = unlisten;

    try {
      await invoke<string>("download_video", {
        url: url,
        quality: quality,
        outputDir: folderPath,
      });

      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId ? { ...d, status: "complete", progress: "100%" } : d
        )
      );
    } catch (e) {
      setDownloads((prev) =>
        prev.map((d) => (d.id === downloadId ? { ...d, status: "error" } : d))
      );
      setError(String(e));
    } finally {
      unlisten();
      unlistenRef.current = null;
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
        }}
      />
      <InputLinkComponent
        url={url}
        quality={quality}
        error={error}
        onUrlChange={setUrl}
        onQualityChange={(newQuality) => {
          setQuality(newQuality);
          saveSettings(folderPath, destination, newQuality);
        }}
        onDownload={handleDownload}
      />
      <CurrentDownloads downloads={downloads} />
    </div>
  );
}

export default App;
