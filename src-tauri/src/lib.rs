use std::env;
use std::path::PathBuf;
use std::time::SystemTime;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;

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

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn download_video(
    app_handle: tauri::AppHandle,
    url: String,
    quality: String,
    output_dir: String,
) -> Result<String, String> {
    let yt_dlp_path = find_yt_dlp().ok_or_else(|| {
        "yt-dlp not found. See README.md or run setup.bat (Windows) / setup.sh (Linux) to download it.".to_string()
    })?;

    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let log_path = std::env::temp_dir().join(format!("ytdapper_{}.log", timestamp));

    let mut child = Command::new(&yt_dlp_path)
        .env("PYTHONUNBUFFERED", "1")
        .args([
            "--progress",
            "--newline",
            "--no-colors",
            "-f", &format!("best[height<={}]", quality),
            "-P", &output_dir,
            &url,
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().expect("stdout not captured");
    let stderr = child.stderr.take().expect("stderr not captured");

    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);

    let mut stdout_lines = stdout_reader.lines();
    let mut stderr_lines = stderr_reader.lines();

    loop {
        tokio::select! {
            line = stdout_lines.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        let line_with_newline = format!("{}\n", line);
                        tokio::fs::write(&log_path, &line_with_newline)
                            .await
                            .map_err(|e| e.to_string())?;
                        app_handle.emit("yt-dlp-output", line).map_err(|e| e.to_string())?;
                    }
                    Ok(None) => {}
                    Err(e) => eprintln!("stdout error: {}", e),
                }
            }
            line = stderr_lines.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        let line_with_newline = format!("{}\n", line);
                        tokio::fs::write(&log_path, &line_with_newline)
                            .await
                            .map_err(|e| e.to_string())?;
                        app_handle.emit("yt-dlp-output", line).map_err(|e| e.to_string())?;
                    }
                    Ok(None) => {}
                    Err(e) => eprintln!("stderr error: {}", e),
                }
            }
            status = child.wait() => {
                match status {
                    Ok(status) => {
                        if status.success() {
                            return Ok(log_path.to_string_lossy().to_string());
                        } else {
                            return Err(format!(
                                "Download failed with exit code: {:?}\nLog file: {}",
                                status.code(),
                                log_path.display()
                            ));
                        }
                    }
                    Err(e) => return Err(e.to_string()),
                }
            }
        }
    }
}

#[tauri::command]
fn open_in_default_app(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                    _ => println!("unexpected menu event"),
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, download_video, open_in_default_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
