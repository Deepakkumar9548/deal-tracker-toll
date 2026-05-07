import * as helpers from "./helpers.js";
import * as dealForm from "./dealForm.js";
import * as ppt from "./ppt.js";
import * as records from "./records.js";
import * as summary from "./summary.js";
import * as health from "./health.js";
import * as ui from "./ui.js";
import "./FILTERPPTDOWNLOAD.js";
import "./BULKEXCELUPLOAD.js";

const app = {
  API_URL: "/api/deals",
  DB: [],
  recordsMeta: { page: 1, limit: 100, total: 0, totalPages: 1 },
  currentDealId: null,
  selectedDealIds: new Set(),
  bulkEditMode: false,
  latencyChart: null,
  memoryChart: null,
  monitorEventSource: null,
  lastHealthSnapshot: null,
  currentUploadedDocs: [],

  PILL_META: {
    "pill-audio": "Audio Upload",
    "pill-video": "Video Upload",
    "pill-quot": "Quotation",
    "pill-price": "Pricelist",
    "pill-ledger": "Ledger",
    "pill-slip": "Payment Slip",
    "pill-other": "Other Upload",
    "pill-paycard": "Pay Card",
  },

  DB_FILE_MAP: {
    "pill-audio": "audioUpload",
    "pill-video": "videoUpload",
    "pill-quot": "quotation",
    "pill-price": "pricelist",
    "pill-ledger": "ledger",
    "pill-slip": "paymentSlip",
    "pill-other": "other",
    "pill-paycard": "paymentCard",
  },
};

/**
 * Loads an HTML file into a target container.
 */
async function loadComponent(id, url) {
  const target = document.getElementById(id);
  if (!target) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Load failed for ${url}`);
  const html = await res.text();
  target.innerHTML = html;
}

/**
 * File viewing logic
 */
function viewFile(pillId) {
  const unsaved = app.currentUploadedDocs.find((d) => d.pillId === pillId);
  if (unsaved) return openPreview(unsaved.dataUrl, unsaved.fileName);
  if (app.currentDealId) {
    const deal = app.DB.find((d) => d.id === app.currentDealId);
    if (deal && deal.files) {
      const dbKey = app.DB_FILE_MAP[pillId];
      const filePath = deal.files[dbKey];
      if (filePath) {
        const fileName = filePath.split("/").pop();
        const url = filePath.startsWith("http")
          ? filePath
          : window.location.origin + filePath;
        return openPreview(url, fileName);
      }
    }
  }
}

function openPreview(url, name) {
  const isViewable = /\.(pdf|jpg|jpeg|png|gif)$/i.test(name);
  if (isViewable) window.open(url, "_blank");
  else {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// ─────────────────────────────────────────────
// INITIALIZATION & BINDINGS
// ─────────────────────────────────────────────

async function init() {
  // Load Layout Components
  await Promise.all([
    loadComponent("topbar-container", "components/topbar.html"),
    loadComponent("sidebar-container", "components/sidebar.html"),
  ]);

  // Load Pages into a shared container (concatenated)
  const pageContainer = document.getElementById("page-container");
  if (!pageContainer) return;

  const pages = [
    "pages/new-deal.html",
    "pages/records.html",
    "pages/summary.html",
    "pages/health.html",
    "pages/calculator.html",
    "pages/tl-report.html",
  ];
  const pageContents = await Promise.all(
    pages.map(async (p) => {
      const res = await fetch(p);
      if (!res.ok) {
        console.error(`Page load failed: ${p}`);
        return "";
      }
      return await res.text();
    }),
  );
  pageContainer.innerHTML = pageContents.join("\n");

  // Initialize Data
  records.fetchDeals(app);
  dealForm.updateObsText();

  // Add click listeners to pills for previewing
  document.querySelectorAll(".upload-pill").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      if (pill.classList.contains("done") && e.target.tagName !== "INPUT") {
        e.preventDefault();
        viewFile(pill.id);
      }
    });
  });

  // Button Binding
  const dlBtn = helpers.g("downloadPPT");
  if (dlBtn)
    dlBtn.addEventListener("click", () =>
      ppt.generatePPT(app.DB, app.DB_FILE_MAP),
    );

  // Navigation bindings
  helpers
    .g("nav-new")
    ?.addEventListener("click", () => ui.switchTab(app, "new"));
  helpers
    .g("nav-records")
    ?.addEventListener("click", () => ui.switchTab(app, "records"));
  helpers
    .g("nav-summary")
    ?.addEventListener("click", () => ui.switchTab(app, "summary"));
  helpers
    .g("nav-health")
    ?.addEventListener("click", () => ui.switchTab(app, "health"));
  helpers
    .g("nav-calculator")
    ?.addEventListener("click", () => ui.switchTab(app, "calculator"));
  helpers
    .g("nav-tl-report")
    ?.addEventListener("click", () => ui.switchTab(app, "tl-report"));
  helpers
    .g("save-btn")
    ?.addEventListener("click", () => dealForm.saveRecord(app));
  helpers
    .g("clear-btn")
    ?.addEventListener("click", () => dealForm.clearForm(app));
  helpers
    .g("search-inp")
    ?.addEventListener("input", () => records.scheduleFetchDeals(app));
  helpers
    .g("btn-bulk-edit")
    ?.addEventListener("click", () => records.toggleBulkEditMode(app));
  helpers
    .g("delete-multiple-btn")
    ?.addEventListener("click", () => records.deleteSelectedRecords(app));
  helpers
    .g("export-csv-btn")
    ?.addEventListener("click", () => ui.exportExcel(app));
}

// Expose required functions to window
window.app = {
  ...app,
  loadRecord: (id) => dealForm.loadRecord(app, id),
  deleteRecord: (id) => records.deleteRecord(app, id),
  toggleRecordSelection: (id, checked) => records.toggleRecordSelection(app, id, checked),
  toggleVisibleRecordsSelection: (checked) => records.toggleVisibleRecordsSelection(app, checked),
  toggleBulkEditMode: () => records.toggleBulkEditMode(app),
  goToRecordsPage: (page) => records.goToRecordsPage(app, page),
  viewFirstDoc: (id) => {
    const d = app.DB.find((r) => r.id === id);
    if (!d || !d.files) return;
    const firstKey = Object.keys(d.files)[0];
    const path = d.files[firstKey];
    if (path) {
      const name = path.split("/").pop();
      const url = path.startsWith("http")
        ? path
        : window.location.origin + path;
      openPreview(url, name);
    }
  },
};
window.pillDone = (id, input) => dealForm.pillDone(app, id, input);
window.calcDeal = () => dealForm.calcDeal();
window.calcDisc = () => dealForm.calcDisc(app);
window.saveRecord = () => dealForm.saveRecord(app);
window.renderRecords = () => records.scheduleFetchDeals(app);
window.refreshDeals = () => records.fetchDeals(app);
window.renderSummary = () => summary.renderSummary(app);
window.switchTab = (name) => ui.switchTab(app, name);
window.clearForm = () => dealForm.clearForm(app);
window.exportExcel = () => ui.exportExcel(app);
window.generatePPT = () => ppt.generatePPT(app.DB, app.DB_FILE_MAP);
window.generateHealthPPT = () => health.generateHealthPPT();

document.addEventListener("DOMContentLoaded", init);
