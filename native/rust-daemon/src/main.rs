//! Zaiken Native Daemon
//! High-performance process for system metrics + heavy game scanning.
//! Communicates with Electron Main via TCP localhost (or named pipe later).
//!
//! Protocol: newline-delimited JSON
//!   Request:  {"id":1,"method":"get_metrics","params":{}}
//!   Response: {"id":1,"ok":true,"result":{...}}

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

const DEFAULT_PORT: u16 = 17_831;
const METRICS_INTERVAL_MS: u64 = 1000;

// ─── Protocol ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct Request {
    id: u64,
    method: String,
    #[serde(default)]
    params: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct Response {
    id: u64,
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct Metrics {
    cpu: f32,
    ram_used_mb: u64,
    ram_total_mb: u64,
    gpu: Option<f32>,
    ping_ms: Option<u32>,
    timestamp: u64,
}

#[derive(Debug, Serialize)]
struct GameEntry {
    name: String,
    platform: String,
    exe_path: Option<String>,
    steam_app_id: Option<String>,
    install_dir: Option<String>,
}

// ─── State ──────────────────────────────────────────────────

struct AppState {
    sys: Mutex<System>,
    last_metrics: Mutex<Metrics>,
}

impl AppState {
    fn new() -> Self {
        let sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        Self {
            sys: Mutex::new(sys),
            last_metrics: Mutex::new(Metrics {
                cpu: 0.0,
                ram_used_mb: 0,
                ram_total_mb: 1,
                gpu: None,
                ping_ms: None,
                timestamp: now_ms(),
            }),
        }
    }

    async fn refresh_metrics(&self) -> Metrics {
        let mut sys = self.sys.lock().await;
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let cpu = sys.global_cpu_usage();
        let ram_used_mb = sys.used_memory() / 1024 / 1024;
        let ram_total_mb = sys.total_memory() / 1024 / 1024;

        let m = Metrics {
            cpu: (cpu * 10.0).round() / 10.0,
            ram_used_mb,
            ram_total_mb: ram_total_mb.max(1),
            gpu: None, // platform-specific later
            ping_ms: None,
            timestamp: now_ms(),
        };

        *self.last_metrics.lock().await = m.clone();
        m
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ─── Game scanners (Windows-focused, safe fallbacks) ────────

fn scan_steam() -> Vec<GameEntry> {
    let mut out = Vec::new();
    let candidates = steam_library_roots();
    let re = regex::Regex::new(r#""appid"\s+"(\d+)""#).unwrap();
    let re_name = regex::Regex::new(r#""name"\s+"([^"]+)""#).unwrap();
    let re_dir = regex::Regex::new(r#""installdir"\s+"([^"]+)""#).unwrap();

    for root in candidates {
        let steamapps = root.join("steamapps");
        if !steamapps.is_dir() {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(&steamapps) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path
                    .extension()
                    .map(|e| e == "acf")
                    .unwrap_or(false)
                    && path
                        .file_name()
                        .map(|n| n.to_string_lossy().starts_with("appmanifest_"))
                        .unwrap_or(false)
                {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let app_id = re
                            .captures(&content)
                            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));
                        let name = re_name
                            .captures(&content)
                            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
                            .unwrap_or_else(|| "Unknown Steam Game".into());
                        let install_dir = re_dir
                            .captures(&content)
                            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

                        let full_dir = install_dir.as_ref().map(|d| steamapps.join("common").join(d));

                        out.push(GameEntry {
                            name,
                            platform: "steam".into(),
                            exe_path: None,
                            steam_app_id: app_id,
                            install_dir: full_dir.map(|p| p.to_string_lossy().into_owned()),
                        });
                    }
                }
            }
        }
    }
    out
}

fn steam_library_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    // Windows default
    if let Some(pf) = std::env::var_os("ProgramFiles(x86)") {
        roots.push(PathBuf::from(pf).join("Steam"));
    }
    if let Some(pf) = std::env::var_os("ProgramFiles") {
        roots.push(PathBuf::from(pf).join("Steam"));
    }
    // Linux
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join(".steam/steam"));
        roots.push(home.join(".local/share/Steam"));
    }
    // macOS
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join("Library/Application Support/Steam"));
    }

    roots.into_iter().filter(|p| p.exists()).collect()
}

fn scan_epic() -> Vec<GameEntry> {
    let mut out = Vec::new();
    let manifests = epic_manifest_dirs();

    for dir in manifests {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "item").unwrap_or(false) {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                            let name = v
                                .get("DisplayName")
                                .and_then(|x| x.as_str())
                                .unwrap_or("Unknown Epic Game")
                                .to_string();
                            let install = v
                                .get("InstallLocation")
                                .and_then(|x| x.as_str())
                                .map(|s| s.to_string());
                            out.push(GameEntry {
                                name,
                                platform: "epic".into(),
                                exe_path: None,
                                steam_app_id: None,
                                install_dir: install,
                            });
                        }
                    }
                }
            }
        }
    }
    out
}

fn epic_manifest_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(pd) = std::env::var_os("ProgramData") {
        dirs.push(PathBuf::from(pd).join("Epic/EpicGamesLauncher/Data/Manifests"));
    }
    // Linux / other fallbacks can be added later
    dirs.into_iter().filter(|p| p.exists()).collect()
}

fn scan_all_games() -> Vec<GameEntry> {
    let mut games = Vec::new();
    games.extend(scan_steam());
    games.extend(scan_epic());
    // GOG + well-known titles can be added the same way
    games
}

// ─── Request handling ───────────────────────────────────────

async fn handle_request(state: &AppState, req: Request) -> Response {
    match req.method.as_str() {
        "ping" => Response {
            id: req.id,
            ok: true,
            result: Some(serde_json::json!({ "pong": true, "version": "0.1.0" })),
            error: None,
        },
        "get_metrics" => {
            let m = state.refresh_metrics().await;
            Response {
                id: req.id,
                ok: true,
                result: Some(serde_json::to_value(m).unwrap_or_default()),
                error: None,
            }
        }
        "get_last_metrics" => {
            let m = state.last_metrics.lock().await.clone();
            Response {
                id: req.id,
                ok: true,
                result: Some(serde_json::to_value(m).unwrap_or_default()),
                error: None,
            }
        }
        "scan_games" => {
            // Heavy work – runs on blocking pool
            let games = tokio::task::spawn_blocking(scan_all_games)
                .await
                .unwrap_or_default();
            Response {
                id: req.id,
                ok: true,
                result: Some(serde_json::to_value(games).unwrap_or_default()),
                error: None,
            }
        }
        other => Response {
            id: req.id,
            ok: false,
            result: None,
            error: Some(format!("unknown method: {other}")),
        },
    }
}

async fn handle_client(state: Arc<AppState>, stream: TcpStream) {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let req: Request = match serde_json::from_str(line) {
            Ok(r) => r,
            Err(e) => {
                warn!("bad request: {e}");
                let err = Response {
                    id: 0,
                    ok: false,
                    result: None,
                    error: Some(format!("invalid json: {e}")),
                };
                let _ = writer
                    .write_all(format!("{}\n", serde_json::to_string(&err).unwrap_or_default()).as_bytes())
                    .await;
                continue;
            }
        };

        let resp = handle_request(&state, req).await;
        let payload = serde_json::to_string(&resp).unwrap_or_default() + "\n";
        if writer.write_all(payload.as_bytes()).await.is_err() {
            break;
        }
    }
}

// ─── Background metrics loop ────────────────────────────────

async fn metrics_loop(state: Arc<AppState>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_millis(METRICS_INTERVAL_MS));
    loop {
        interval.tick().await;
        let _ = state.refresh_metrics().await;
    }
}

// ─── Main ───────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "zaiken_daemon=info".into()),
        )
        .init();

    let port: u16 = std::env::var("ZAIKEN_DAEMON_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let addr: SocketAddr = format!("127.0.0.1:{port}").parse()?;
    let listener = TcpListener::bind(addr)
        .await
        .with_context(|| format!("failed to bind {addr}"))?;

    info!("Zaiken daemon listening on {addr}");

    let state = Arc::new(AppState::new());

    // Background sampler
    tokio::spawn(metrics_loop(state.clone()));

    loop {
        match listener.accept().await {
            Ok((stream, peer)) => {
                info!("client connected: {peer}");
                let st = state.clone();
                tokio::spawn(async move {
                    handle_client(st, stream).await;
                });
            }
            Err(e) => error!("accept error: {e}"),
        }
    }
}
