/**
 * Native Desktop Bridge Interface.
 * Handles IPC communications between the Next.js UI frontend and Tauri/Electron desktop wrapper.
 */

export interface DesktopSystemStatus {
  isDesktopApp: boolean;
  backendUrl: string;
  ollamaAvailable: boolean;
  platform: string;
}

export class DesktopBridge {
  static isTauriAvailable(): boolean {
    return typeof window !== "undefined" && "__TAURI__" in window;
  }

  static async getSystemStatus(): Promise<DesktopSystemStatus> {
    const isDesktop = this.isTauriAvailable();
    let ollamaOk = false;

    try {
      const res = await fetch("http://localhost:8000/health", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        ollamaOk = data.ollama_connected ?? false;
      }
    } catch {
      ollamaOk = false;
    }

    return {
      isDesktopApp: isDesktop,
      backendUrl: "http://127.0.0.1:8000",
      ollamaAvailable: ollamaOk,
      platform: typeof window !== "undefined" ? navigator.platform : "win32"
    };
  }

  static async openNativeFileDialog(): Promise<string | null> {
    if (this.isTauriAvailable()) {
      try {
        const tauri = (window as any).__TAURI__;
        if (tauri && tauri.dialog) {
          const selected = await tauri.dialog.open({
            multiple: false,
            filters: [{ name: "Data Files", extensions: ["csv", "xlsx", "parquet", "json", "pdf", "sqlite"] }]
          });
          return typeof selected === "string" ? selected : null;
        }
      } catch (e) {
        console.warn("Tauri dialog fallback:", e);
      }
    }
    return null;
  }
}
