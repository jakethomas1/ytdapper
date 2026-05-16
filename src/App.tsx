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
  status: "downloading" | "complete" | "error" | "cancelled" | "paused";
  folderPath: string;
  url: string;
  quality: string;
  isAudioOnly: boolean;
}

function App() {
  const [destination, setDestination] = useState<string>("Downloads");
  const [folderPath, setFolderPath] = useState<string>("");
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720");
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [folderError, setFolderError] = useState<string>("");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [hasCompleted, setHasCompleted] = useState(false);
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

        setDownloads((prev) => {
          const parsed = parseDownloadOutput(line);

          return prev.map((d) => {
            if (d.id === downloadId) {
              return {
                ...d,
                filename: parsed.filename || d.filename,
                progress: parsed.progress || d.progress,
              };
            }
            return d;
          });
        });
      });

      unlistenCompleteRef.current = await listen<[string, string, string]>("yt-dlp-complete", (event) => {
        const [downloadId, status, message] = event.payload;
        console.log("yt-dlp-complete event:", downloadId, status, message);

        setDownloads((prev) =>
          prev.map((d) => {
            if (d.id === downloadId) {
              if (status === "complete") {
                setHasCompleted(true);
                return { 
                  ...d, 
                  status: "complete", 
                  progress: "100%",
                  filename: (() => {
                    let name = d.filename
                      .replace(/\.part$/, "")
                      .replace(/\.f\d+(?=\.[^.]+$)/, "");
                    return d.isAudioOnly
                      ? name.replace(/\.[^.]+$/, ".mp3")
                      : name;
                  })(),// remove .f123 and .part from filename
                };
              } else if (status === "error") {
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
  }, []);

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

  function parseDownloadOutput(line: string): { filename?: string; progress?: string } {
    const result: { filename?: string; progress?: string } = {};

    const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      result.progress = progressMatch[1] + "%";
    }

    const extractFilename = (rawPath: string): string => {
      let fileName = rawPath.split(/[\\/]/).pop() ?? "";
      return fileName + ".part";
    };

    const destinationMatch = line.match(/\[download\]\s*Destination:\s*(.+)/);
    if (destinationMatch) {
      result.filename = extractFilename(destinationMatch[1]);
      return result;
    }

    const alreadyDownloadedMatch = line.match(/\[download\]\s*(.+?)\s+has already been downloaded/);
    if (alreadyDownloadedMatch) {
      result.filename = extractFilename(alreadyDownloadedMatch[1]);
      result.progress = "100%";
    }

    return result;
  }

  async function handleDownload() {
    const rawText = inputLinkRef.current?.getText() ?? url;
    const urls = rawText.split('\n').filter(u => u.trim());

    if (urls.length === 0) {
      return;
    }
    if (!folderPath) {
      setFolderError("Please select a destination folder");
      return;
    }
    setFolderError("");

    // Fire all downloads concurrently instead of awaiting each sequentially
    const newDownloads = await Promise.all(
      urls.map(async (urlStr) => {
        const downloadId = await invoke<string>("download_video", {
          url: urlStr.trim(),
          quality: quality,
          outputDir: folderPath,
          isAudioOnly: isAudioOnly,
        });
        return {
          id: downloadId,
          filename: "Starting...",
          progress: "0%",
          status: "downloading" as const,
          folderPath: folderPath,
          url: urlStr.trim(),
          quality: quality,
          isAudioOnly: isAudioOnly,
        };
      })
    );

    // Add all new downloads to state in one atomic update
    setDownloads((prev) => [...newDownloads, ...prev]);

    inputLinkRef.current?.clear();
  }

  async function handlePause(downloadId: string) {
    setDownloads((prev) =>
      prev.map((d) => (d.id === downloadId ? { ...d, status: "paused" } : d))
    );
    try {
      await invoke("cancel_download", { downloadId });
    } catch (e) {
      console.error("Failed to pause download:", e);
      setDownloads((prev) =>
        prev.map((d) => (d.id === downloadId ? { ...d, status: "downloading" } : d))
      );
    }
  }

  async function handleResume(downloadId: string) {
    const download = downloads.find((d) => d.id === downloadId);
    if (!download) return;

    try {
      const newDownloadId = await invoke<string>("download_video", {
        url: download.url,
        quality: download.quality,
        outputDir: download.folderPath,
        isAudioOnly: download.isAudioOnly,
      });

      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId
            ? { ...d, id: newDownloadId, status: "downloading" as const }
            : d
        )
      );
    } catch (e) {
      console.error("Failed to resume download:", e);
    }
  }

  function handleOpenFolder(download: DownloadItem) {
    const fullPath = `${download.folderPath}${download.folderPath.includes('\\') ? '\\' : '/'}${download.filename}`;
    invoke("open_in_default_app", { path: fullPath }).catch((e) => {
      console.error("Failed to open folder:", e);
    });
  }

  function handleFolderMoved(id: string, newFolderPath: string) {
  setDownloads((prev) =>
    prev.map((d) => d.id === id ? { ...d, folderPath: newFolderPath } : d)
  );
}

  function handleClearCompleted() {
    setDownloads((prev) => prev.filter((d) => d.status !== "complete"));
    setHasCompleted(false);
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
        error={folderError}
        onErrorClear={() => setFolderError("")}
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
        url={url}
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
      <CurrentDownloads downloads={downloads} onPause={handlePause} onResume={handleResume} onOpenFolder={handleOpenFolder} hasCompleted={hasCompleted} onClearCompleted={handleClearCompleted} onFolderMoved={handleFolderMoved} />
    </div>
  );
}

export default App;