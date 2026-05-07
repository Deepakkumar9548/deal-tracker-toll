const JSX_PATH = "pages/DealTrackMIS.jsx";
const CDN = {
  react: [
    "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js",
    "https://unpkg.com/react@18.2.0/umd/react.production.min.js",
  ],
  reactDom: [
    "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js",
    "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js",
  ],
  propTypes: [
    "https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js",
    "https://unpkg.com/prop-types@15.8.1/prop-types.min.js",
  ],
  recharts: [
    "https://cdn.jsdelivr.net/npm/recharts@2.10.4/umd/Recharts.min.js",
    "https://unpkg.com/recharts@2.10.4/umd/Recharts.min.js",
    "https://cdn.jsdelivr.net/npm/recharts@2.10.4/umd/Recharts.js",
    "https://unpkg.com/recharts@2.10.4/umd/Recharts.js",
  ],
  babel: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js",
};

let frameLoaded = false;

function summaryFrame() {
  return document.getElementById("dealtrackmis-frame");
}

function frameDocument(jsxUrl) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, #root { margin:0; min-height:100%; background:#0A0E1A; }
      .loader {
        min-height:100vh; display:flex; align-items:center; justify-content:center;
        color:#e2e8f0; font:600 14px 'DM Sans', Arial, sans-serif; background:#0A0E1A;
      }
      .loader.error { color:#ef4444; padding:24px; text-align:center; }
    </style>
  </head>
  <body>
    <div id="root"><div class="loader">Loading DealTrack MIS dashboard...</div></div>
    <script>
      const JSX_URL = ${JSON.stringify(jsxUrl)};
      const CDN = ${JSON.stringify(CDN)};

      function loadScript(src, globalName) {
        return new Promise((resolve, reject) => {
          if (globalName && window[globalName]) {
            resolve(window[globalName]);
            return;
          }
          const script = document.createElement("script");
          script.src = src;
          script.onload = () => {
            if (!globalName || window[globalName]) resolve(window[globalName]);
            else reject(new Error(globalName + " is not defined after loading " + src));
          };
          script.onerror = () => reject(new Error("Failed to load " + src));
          document.head.appendChild(script);
        });
      }

      async function loadFirstAvailable(urls, globalName) {
        const list = Array.isArray(urls) ? urls : [urls];
        let lastError = null;
        for (const url of list) {
          try {
            return await loadScript(url, globalName);
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error("Failed to load " + globalName);
      }

      function sanitizeJsx(source) {
        return source
          .replace(/import[\\s\\S]*?;\\s*/g, "")
          .replace(/export\\s+default\\s+function\\s+DealTrackMIS/, "function DealTrackMIS");
      }

      function fail(error) {
        console.error("DealTrack MIS iframe failed:", error);
        document.getElementById("root").innerHTML =
          '<div class="loader error">DealTrack MIS failed to load: ' + (error.message || error) + '</div>';
      }

      async function boot() {
        try {
          await loadFirstAvailable(CDN.react, "React");
          await loadFirstAvailable(CDN.reactDom, "ReactDOM");
          await loadFirstAvailable(CDN.propTypes, "PropTypes");
          await loadFirstAvailable(CDN.recharts, "Recharts");
          await loadFirstAvailable(CDN.babel, "Babel");

          if (window.React.version !== "18.2.0") {
            throw new Error("React version mismatch. Expected 18.2.0, got " + window.React.version);
          }
          if (!window.ReactDOM || !window.Recharts || !window.PropTypes) {
            throw new Error("React, ReactDOM, PropTypes, or Recharts did not load correctly.");
          }

          const response = await fetch(JSX_URL + "?v=" + Date.now());
          if (!response.ok) throw new Error("Unable to load DealTrackMIS.jsx");
          const jsx = sanitizeJsx(await response.text());
          const prelude = \`
            const { useState, useEffect, useMemo, useRef, useCallback } = React;
            const {
              BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
              XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
              FunnelChart, Funnel, LabelList
            } = Recharts;
          \`;
          const code = Babel.transform(prelude + "\\n" + jsx + "\\nDealTrackMIS;", {
            presets: ["react"],
            filename: "DealTrackMIS.jsx",
          }).code;
          const DealTrackMIS = Function("React", "Recharts", code + "\\nreturn DealTrackMIS;")(window.React, window.Recharts);
          const root = ReactDOM.createRoot(document.getElementById("root"));
          root.render(React.createElement(DealTrackMIS));
        } catch (error) {
          fail(error);
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
      } else {
        boot();
      }
    </script>
  </body>
</html>`;
}

export async function renderSummary() {
  const frame = summaryFrame();
  if (!frame || frameLoaded) return;

  const jsxUrl = new URL(JSX_PATH, window.location.href).href;
  frame.srcdoc = frameDocument(jsxUrl);
  frameLoaded = true;
}
