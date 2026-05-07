import { g } from './helpers.js';

export async function fetchHealthStats(app) {
  try {
    const res = await fetch(app.API_URL + "/health");
    const d = await res.json();
    const statusEl = g("h-status");
    if (statusEl) {
      statusEl.textContent = d.status;
      statusEl.style.color = d.status === "HEALTHY" ? "var(--green)" : "var(--red)";
    }
    g("h-datasize").textContent = d.dataSizeMB + " MB";
    g("h-usage").textContent = d.storageUsagePercent + "%";
    g("h-users").textContent = d.estimatedMaxUsers;
    g("h-memory").textContent = d.memoryUsageMB + " MB";
    updateCharts(app, 100, d.systemMemUsagePercent);
  } catch (err) {
    console.error("Health check failed");
  }
}

export function updateCharts(app, latency, memoryUsage) {
  if (!app.latencyChart) {
    app.latencyChart = new Chart(g("latencyChart"), {
      type: "line",
      data: {
        labels: Array(20).fill(""),
        datasets: [{ label: "ms", data: Array(20).fill(0), borderColor: "#5c9fe0" }],
      },
    });
    app.memoryChart = new Chart(g("memoryChart"), {
      type: "line",
      data: {
        labels: Array(20).fill(""),
        datasets: [{ label: "%", data: Array(20).fill(0), borderColor: "#c8a96e" }],
      },
    });
  }
  app.latencyChart.data.datasets[0].data.push(latency);
  app.latencyChart.data.datasets[0].data.shift();
  app.latencyChart.update();
  app.memoryChart.data.datasets[0].data.push(memoryUsage);
  app.memoryChart.data.datasets[0].data.shift();
  app.memoryChart.update();
}

export async function generateHealthPPT() {
  const ppt = new PptxGenJS();
  ppt.addSlide().addText("System Health Report", { x: 1, y: 1, fontSize: 32 });
  await ppt.writeFile({ fileName: "Health_Report.pptx" });
}
