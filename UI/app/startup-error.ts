export function installStartupErrorOverlay() {
  const show = (message: string) => {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = `
      <div style="
        min-height: 100vh;
        background: #141414;
        color: #f5f5f5;
        font-family: Inter, system-ui, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
      ">
        <div style="
          max-width: 720px;
          border: 1px solid #3a3a3a;
          background: #1a1a1a;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 18px 60px rgba(0,0,0,0.3);
        ">
          <h1 style="font-size: 18px; margin: 0 0 12px;">Wallwize could not start</h1>
          <pre style="
            white-space: pre-wrap;
            color: #fca5a5;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
          ">${escapeHtml(message)}</pre>
        </div>
      </div>
    `;
  };

  window.addEventListener('error', (event) => {
    show(event.error?.stack || event.message || 'Unknown renderer error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    show(reason?.stack || reason?.message || String(reason));
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

