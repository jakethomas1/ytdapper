use std::collections::HashMap;
use std::env;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

static DOWNLOAD_COUNTER: AtomicU64 = AtomicU64::new(0);

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

struct DownloadHandle {
    pid: u32,
    log_path: PathBuf,
    kill_tx: mpsc::Sender<()>,
}

struct DownloadState {
    downloads: HashMap<String, DownloadHandle>,
}

fn find_yt_dlp() -> Option<PathBuf> {
    let cwd = env::current_dir().ok();
    let exe_dir = env::current_exe().ok().and_then(|e| e.parent().map(|p| p.to_path_buf()));

    if let Some(paths) = env::var_os("PATH") {
        for dir in env::split_paths(&paths) {
            #[cfg(windows)]
            {
                let yt_dlp = dir.join("yt-dlp.exe");
                if yt_dlp.exists() {
                    return Some(yt_dlp);
                }
            }
            #[cfg(not(windows))]
            {
                if dir.join("yt-dlp").exists() {
                    return Some(dir.join("yt-dlp"));
                }
            }
        }
    }

    if let Some(ref dir) = cwd {
        let bin_yt_dlp = dir.join("bin").join("yt-dlp");
        #[cfg(windows)]
        let bin_yt_dlp = bin_yt_dlp.with_extension("exe");
        if bin_yt_dlp.exists() {
            return Some(bin_yt_dlp);
        }
    }

    if let Some(ref dir) = exe_dir {
        let bin_yt_dlp = dir.join("bin").join("yt-dlp");
        #[cfg(windows)]
        let bin_yt_dlp = bin_yt_dlp.with_extension("exe");
        if bin_yt_dlp.exists() {
            return Some(bin_yt_dlp);
        }
    }

    None
}

#[cfg(windows)]
fn send_ctrl_c(pid: u32) -> Result<(), String> {
    use windows::Win32::System::Console::GenerateConsoleCtrlEvent;
    use windows::Win32::System::Console::CTRL_C_EVENT;

    unsafe {
        let result = GenerateConsoleCtrlEvent(CTRL_C_EVENT, pid);
        if result.is_err() {
            return Err(format!("Failed to send CTRL+C to process {}", pid));
        }
    }
    Ok(())
}

#[cfg(unix)]
fn send_sigint(pid: u32) -> Result<(), String> {
    use libc::kill;
    use libc::SIGINT;

    unsafe {
        if kill(pid as libc::pid_t, SIGINT) != 0 {
            return Err(format!("Failed to send SIGINT to process {}", pid));
        }
    }
    Ok(())
}

fn create_command(yt_dlp_path: &PathBuf, url: &str, quality: &str, output_template: &str, is_audio_only: bool) -> Command {
    let mut cmd = Command::new(yt_dlp_path);
    cmd.env("PYTHONUNBUFFERED", "1");
    cmd.env("PYTHONIOENCODING", "utf-8");

    #[cfg(windows)]
    cmd.creation_flags(0x08000200);

    if is_audio_only {
        cmd.args([
            "--encoding", "utf-8",
            "--progress",
            "--newline",
            "--no-colors",
            "--replace-in-metadata", "title", "[—–]", "-",  // em/en dash → hyphen
            "--replace-in-metadata", "title", "[?#%&]", "_", // url-special chars,
            "-f", "bestaudio/best",
            "-x",
            "--audio-format", "mp3",
            "--embed-thumbnail",
            "-o", output_template,
            url,
        ]);
    } else {
        cmd.args([
            "--encoding", "utf-8",
            "--progress",
            "--newline",
            "--no-colors",
            "--replace-in-metadata", "title", "[\\u2014\\u2013]", "-",  // em/en dash → hyphen [—–]
            "--replace-in-metadata", "title", "[?#%&]", "_", // url-special chars,
            "-f", &format!("bestvideo[height<={}]+bestaudio/best", quality), //When you used best[height<={}], yt-dlp was falling back to a pre-muxed format and naming the intermediate 
            "-o", output_template,                                           //files with the format ID. With bestvideo+bestaudio, yt-dlp knows upfront it's doing a merge, so it
            url,                                                             //names the destination after the final output file from the start rather than the intermediate stream file.
        ]);
    }

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd
}

#[tauri::command]
async fn download_video(
    app_handle: tauri::AppHandle,
    url: String,
    quality: String,
    output_dir: String,
    is_audio_only: bool,
    state: tauri::State<'_, Arc<Mutex<DownloadState>>>,
) -> Result<String, String> {
    let yt_dlp_path = find_yt_dlp().ok_or_else(|| {
        "yt-dlp not found. See README.md or run setup.bat (Windows) / setup.sh (Linux) to download it.".to_string()
    })?;

    let id = DOWNLOAD_COUNTER.fetch_add(1, Ordering::Relaxed);
    let download_id = format!("download_{}", id);
    let log_path = std::env::temp_dir().join(format!("ytdapper_{}.log", id));

    let output_template = if is_audio_only {
        format!("{}/%(title)s.%(ext)s", output_dir)
    } else {
        format!("{}/%(title)s [{}p].%(ext)s", output_dir, quality)
    };

    let mut cmd = create_command(&yt_dlp_path, &url, &quality, &output_template, is_audio_only);
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let pid = child.id().ok_or("Failed to get process ID")?;

    let stdout = child.stdout.take().ok_or("stdout not captured")?;
    let stderr = child.stderr.take().ok_or("stderr not captured")?;

    let (kill_tx, mut kill_rx) = mpsc::channel::<()>(1);

    let log_path_clone = log_path.clone();
    let app_handle_clone = app_handle.clone();
    let download_id_clone = download_id.clone();
    let state_clone = Arc::clone(&state);

    tokio::spawn(async move {
        let stdout_reader = BufReader::new(stdout);
        let stderr_reader = BufReader::new(stderr);

        let mut stdout_lines = stdout_reader.lines();
        let mut stderr_lines = stderr_reader.lines();

        loop {
            tokio::select! {
                _ = kill_rx.recv() => {
                    {
                        let mut state = state_clone.lock().unwrap();
                        state.downloads.remove(&download_id_clone);
                    }
                    let _ = app_handle_clone.emit("yt-dlp-complete", (&download_id_clone, "cancelled", "Download cancelled by user".to_string()));
                    let _ = child.kill().await;
                    break;
                }
                line = stdout_lines.next_line() => {
                    match line {
                        Ok(Some(line)) => {
                            let line_with_newline = format!("{}\n", line);
                            let _ = tokio::fs::write(&log_path_clone, &line_with_newline).await;
                            let _ = app_handle_clone.emit("yt-dlp-output", (&download_id_clone, line));
                        }
                        Ok(None) => {}
                        Err(e) => eprintln!("stdout error: {}", e),
                    }
                }
                line = stderr_lines.next_line() => {
                    match line {
                        Ok(Some(line)) => {
                            let line_with_newline = format!("{}\n", line);
                            let _ = tokio::fs::write(&log_path_clone, &line_with_newline).await;
                            let _ = app_handle_clone.emit("yt-dlp-output", (&download_id_clone, line));
                        }
                        Ok(None) => {}
                        Err(e) => eprintln!("stderr error: {}", e),
                    }
                }
                status = child.wait() => {
                    {
                        let mut state = state_clone.lock().unwrap();
                        state.downloads.remove(&download_id_clone);
                    }

                    match status {
                        Ok(status) => {
                            if status.success() {
                                let _ = app_handle_clone.emit("yt-dlp-complete", (&download_id_clone, "complete", log_path_clone.to_string_lossy().to_string()));
                            } else {
                                let _ = app_handle_clone.emit("yt-dlp-complete", (&download_id_clone, "error", format!("Download failed with exit code: {:?}", status.code())));
                            }
                        }
                        Err(e) => {
                            let _ = app_handle_clone.emit("yt-dlp-complete", (&download_id_clone, "error", e.to_string()));
                        }
                    }
                    break;
                }
            }
        }
    });

    {
        let mut state = state.lock().unwrap();
        state.downloads.insert(download_id.clone(), DownloadHandle { pid, log_path, kill_tx });
    }

    Ok(download_id)
}

#[tauri::command]
fn cancel_download(
    download_id: String,
    state: tauri::State<'_, Arc<Mutex<DownloadState>>>,
) -> Result<(), String> {
    let mut state = state.lock().unwrap();

    if let Some(handle) = state.downloads.remove(&download_id) {
        let pid = handle.pid;

        let _ = handle.kill_tx.try_send(());

        #[cfg(windows)]
        send_ctrl_c(pid)?;

        #[cfg(unix)]
        send_sigint(pid)?;

        Ok(())
    } else {
        eprintln!("cancel_download: {} not found or already completed", download_id);
        Ok(())
    }
}

#[tauri::command]
fn open_in_default_app(path: String) -> Result<(), String> {
    let path_buf = std::path::PathBuf::from(&path);
    
    if path_buf.is_file() {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        open::that(&path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let download_state = Arc::new(Mutex::new(DownloadState {
        downloads: HashMap::new(),
    }));

    tauri::Builder::default()
        .manage(download_state)
        .setup(|app| {
            let import_item = MenuItemBuilder::new("Import List...")
                .id("import_list")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&import_item)
                .build()?;

            let pause = MenuItemBuilder::new("Pause").id("pause").build(app)?;
            let cancel = MenuItemBuilder::new("Cancel").id("cancel").build(app)?;
            let resume = MenuItemBuilder::new("Resume").id("resume").build(app)?;
            let clear_completed = MenuItemBuilder::new("Clear Completed")
                .id("clear_completed")
                .build(app)?;
            let clear_all = MenuItemBuilder::new("Clear All")
                .id("clear_all")
                .build(app)?;

            let actions_menu = SubmenuBuilder::new(app, "Actions")
                .items(&[&pause, &cancel, &resume, &clear_completed, &clear_all])
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &actions_menu])
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(|_app_handle: &tauri::AppHandle, event| {
                println!("menu event: {:?}", event.id());

                match event.id().0.as_str() {
                    "import_list" => println!("import list event"),
                    "pause" => println!("pause event"),
                    "cancel" => println!("cancel event"),
                    "resume" => println!("resume event"),
                    "clear_completed" => println!("clear completed event"),
                    "clear_all" => println!("clear all event"),
                    "toggle_always_on_top" => {},
                    _ => println!("unexpected menu event"),
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_drag::init())
        .invoke_handler(tauri::generate_handler![download_video, cancel_download, open_in_default_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}