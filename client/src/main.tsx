import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(window as any).APP_NAME = "VivaFrutaz";

// ── Global error handlers ─────────────────────────────────────────────────────
function reportError(message: string, source?: string) {
  try {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'FRONTEND_RUNTIME_ERROR',
        description: `[${source || window.location.pathname}] ${message}`,
        level: 'ERROR',
      }),
    }).catch(() => {});
  } catch {}
}

window.addEventListener('error', (event) => {
  if (event.filename?.includes('extension') || event.filename?.includes('chrome-extension')) return;
  reportError(`Uncaught: ${event.message} @ ${event.filename}:${event.lineno}`, 'window.error');
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason) || 'Promise rejection';
  reportError(`UnhandledRejection: ${msg}`, 'unhandledrejection');
});

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
