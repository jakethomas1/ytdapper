# YTDapper Development Guidelines

## Project Overview

YTDapper is a desktop app built with **Tauri + React + TypeScript** that provides a GUI for downloading videos via yt-dlp.

**Data flow:** React UI → Tauri `invoke()` commands → Rust backend → yt-dlp subprocess

## Key Files

| Path | Purpose |
|---|---|
| `src/App.tsx` | Root component; owns download queue state and `DownloadItem` interface |
| `src/Components/` | UI components (co-located CSS) |
| `src/assets/` | Icons and static images |
| `src-tauri/src/main.rs` | Tauri command handlers; spawns yt-dlp |
| `src/main.tsx` | React entry point |

## Development Commands

```bash
# Start dev server (web only, no native features)
npm run dev

# Start full Tauri dev mode (recommended)
npm run tauri dev

# Build production app
npm run tauri build

# Print system/environment info
npm run tauri info
```

## Architecture Notes

### Tauri Commands
All system interactions (file I/O, spawning yt-dlp, reading settings) go through `invoke()` — never call native APIs directly from the frontend.

```typescript
import { invoke } from "@tauri-apps/api/core";

// Example: trigger a download
await invoke("download_video", {
  url: "https://...",
  quality: "1080p",
  audioOnly: false,
  destination: "/Users/..."
});
```

### Backend Events
The Rust backend emits events to the frontend for progress updates. Always clean up listeners to prevent memory leaks:

```typescript
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen("download-progress", (event) => {
  // handle progress payload
});

// In useEffect cleanup:
return () => { unlisten(); };
```

### Persistent Settings
Use the Tauri plugin store — never `localStorage`. The store key schema:

| Key | Type | Description |
|---|---|---|
| `destination` | `string` | Default download folder path |
| `defaultQuality` | `string` | e.g. `"1080p"`, `"720p"`, `"audio"` |
| `theme` | `"light" \| "dark" \| "system"` | UI theme preference |

```typescript
import { load } from "@tauri-apps/plugin-store";

const store = await load("settings.json");
const destination = await store.get<string>("destination");
await store.set("destination", newPath);
await store.save();
```

## Do Not

- **Don't call yt-dlp from the frontend** — all subprocess calls belong in `src-tauri/src/main.rs`
- **Don't use `localStorage` or `sessionStorage`** — use Tauri plugin store for persistence
- **Don't use `window.__TAURI__` directly** — always import from `@tauri-apps/api`
- **Don't ignore unlisten return values** — every `listen()` call must be cleaned up

## Code Style

### TypeScript
- Strict mode is enabled — no implicit `any`
- Use interfaces for object shapes (e.g. `DownloadItem`)
- Annotate function params and return types explicitly
- Document any intentional `any` usage with a comment

### React Components
- Functional components with hooks only
- PascalCase names, default exports
- Early returns for conditional rendering
- Destructure props in function signature

### Naming
| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `InputLinkComponent` |
| Functions/variables | camelCase | `handleDownload` |
| Constants | UPPER_SNAKE_CASE | `QUALITY_OPTIONS` |
| Files | kebab-case | `input-link-component.tsx` |
| Interfaces | PascalCase | `DownloadItem` |
| Event handlers | `handle` prefix | `handleUrlChange` |
| Booleans | `is`/`has`/`should` prefix | `isAudioOnly` |

### Imports
Order: React → third-party → local. Alphabetical within each group.

```typescript
import { useState, useEffect } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import DestinationComponent from "./Components/DestinationComponent";
```

### Error Handling
- Wrap all `invoke()` calls in try/catch
- Show user-facing error messages in the UI; also log to console
- Validate inputs before invoking commands

### CSS
- CSS files are co-located with their component
- Use CSS variables for theme values
- BEM-like class naming
- Avoid `!important`

### Additional Notes
Any time a file is modified, no exceptions, even for single-line changes:
every response summary must include a "Changes Made" section. Group entries 
by logical change; list each affected file as a sub-bullet with its path and 
line range. 

[FORMAT EXAMPLE]
Changes Made
Change number. Short description of change (folder path of file:line number)
- More detailed description / other file/line number details here
[END OF EXAMPLE]

[EXAMPLE OF NOT PREFERRED OUTPUT]
Changes Made
1. Rust backend (src-tauri/src/lib.rs): 
- Modified open_in_default_app to detect if path is a file
- Uses explorer /select,path to highlight the file in Explorer (Windows)
2. DownloadItem interface (src/App.tsx, CurrentDownloads.tsx):
- Added folderPath: string property
[END OF EXAMPLE]

[EXAMPLE OF PREFERRED OUTPUT]
Changes Made
1. Rust backend (src-tauri/src/lib.rs:261-276):
- Modified open_in_default_app to detect if path is a file
- Uses explorer /select,path to highlight the file in Explorer (Windows)
2. DownloadItem interface 
- Added folderPath: string (src/App.tsx:11-17)
- Added folderPath: string (src/Components/CurrentDownloads.tsx:1-7)
[END OF EXAMPLE]