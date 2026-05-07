const API_URL = "/api/deals/bulk";
const DEFAULT_CHUNK_SIZE = 5000;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_FILE_SIZE_MB = 100;
const DEFAULT_MAX_QUEUED_CHUNKS = 4;
const WORKER_XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createExcelWorker() {
  const workerSource = `
    self.importScripts("${WORKER_XLSX_URL}");

    function normalizeSheetRow(row) {
      return row;
    }

    let sheet = null;
    let headers = [];
    let range = null;
    let cursor = 0;
    let chunkSize = 0;
    let totalRows = 0;

    function emitNextChunk() {
      if (!sheet || !range) return;
      if (cursor > range.e.r) {
        self.postMessage({ type: "done", totalRows });
        return;
      }

      const end = Math.min(cursor + chunkSize - 1, range.e.r);
      const chunk = XLSX.utils.sheet_to_json(sheet, {
        header: headers,
        range: { s: { r: cursor, c: range.s.c }, e: { r: end, c: range.e.c } },
        defval: "",
        raw: false,
        blankrows: false,
      }).map(normalizeSheetRow);

      cursor = end + 1;
      self.postMessage({
        type: "chunk",
        chunk,
        parsedRows: Math.min(cursor - range.s.r - 1, totalRows),
        totalRows,
      });
    }

    self.onmessage = function(event) {
      const message = event.data || {};
      if (message.type === "next") {
        emitNextChunk();
        return;
      }

      const { buffer } = message;
      chunkSize = message.chunkSize;
      try {
        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: false,
          dense: false,
          raw: false,
        });
        sheet = workbook.Sheets[workbook.SheetNames[0]];
        range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
        headers = (XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          range: { s: range.s, e: { r: range.s.r, c: range.e.c } },
          defval: "",
          blankrows: false,
        })[0] || []).map((header, index) => String(header || "Column " + (index + 1)).trim());
        cursor = range.s.r + 1;
        totalRows = Math.max(range.e.r - range.s.r, 0);

        self.postMessage({ type: "meta", totalRows });
        emitNextChunk();
      } catch (error) {
        self.postMessage({ type: "error", error: error.message || String(error) });
      }
    };
  `;

  const blob = new Blob([workerSource], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

async function uploadChunk(records, signal) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Bulk upload failed with status ${response.status}`);
  }
  return payload;
}

async function uploadChunkWithRetry(records, signal, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await uploadChunk(records, signal);
    } catch (error) {
      lastError = error;
      if (attempt === retries || signal?.aborted) break;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

function createProgressState() {
  return {
    totalRows: 0,
    parsedRows: 0,
    uploadedRows: 0,
    insertedRows: 0,
    skippedRows: 0,
    failedChunks: 0,
  };
}

function emitProgress(callback, state, phase) {
  const total = Math.max(state.totalRows, state.parsedRows, state.uploadedRows, 1);
  callback?.({
    ...state,
    phase,
    percent: Math.min(100, Math.round((state.uploadedRows / total) * 100)),
  });
}

export async function importDealExcelFile(file, options = {}) {
  if (!file) throw new Error("No file selected");
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error("Only .xlsx, .xls, .csv files are supported");
  }
  const maxFileSizeMb = options.maxFileSizeMb || DEFAULT_MAX_FILE_SIZE_MB;
  if (file.size > maxFileSizeMb * 1024 * 1024) {
    throw new Error(`File is too large. Maximum allowed size is ${maxFileSizeMb} MB.`);
  }

  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  const maxQueuedChunks = options.maxQueuedChunks || DEFAULT_MAX_QUEUED_CHUNKS;
  const onProgress = options.onProgress;
  const signal = options.signal;
  const state = createProgressState();
  const queue = [];
  const errors = [];
  let parserDone = false;
  let activeUploads = 0;
  let parserWaiting = false;
  let worker;
  let resolveUploads;
  let rejectUploads;

  const uploadPump = new Promise((resolve, reject) => {
    resolveUploads = resolve;
    rejectUploads = reject;
  });

  const pumpUploads = () => {
    if (signal?.aborted) {
      rejectUploads(new DOMException("Bulk upload aborted", "AbortError"));
      return;
    }

    while (activeUploads < concurrency && queue.length) {
      const records = queue.shift();
      activeUploads += 1;
      uploadChunkWithRetry(records, signal, options.retries ?? 2)
        .then((result) => {
          state.uploadedRows += records.length;
          state.insertedRows += result.insertedCount || 0;
          state.skippedRows += result.skippedCount || 0;
          emitProgress(onProgress, state, "uploading");
        })
        .catch((error) => {
          state.failedChunks += 1;
          errors.push(error);
        })
        .finally(() => {
          activeUploads -= 1;
          if (parserWaiting && queue.length < maxQueuedChunks) {
            parserWaiting = false;
            worker?.postMessage({ type: "next" });
          }
          pumpUploads();
        });
    }

    if (parserDone && activeUploads === 0 && queue.length === 0) {
      errors.length ? rejectUploads(errors[0]) : resolveUploads();
    }
  };
  const buffer = await file.arrayBuffer();

  emitProgress(onProgress, state, "parsing");

  await new Promise((resolve, reject) => {
    worker = createExcelWorker();

    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "meta") {
        state.totalRows = message.totalRows;
        emitProgress(onProgress, state, "parsing");
      }
      if (message.type === "chunk") {
        state.totalRows = message.totalRows;
        state.parsedRows = message.parsedRows;
        queue.push(message.chunk);
        emitProgress(onProgress, state, "parsing");
        pumpUploads();
        if (queue.length < maxQueuedChunks) {
          worker.postMessage({ type: "next" });
        } else {
          parserWaiting = true;
        }
      }
      if (message.type === "done") {
        state.totalRows = message.totalRows;
        parserDone = true;
        pumpUploads();
        resolve();
      }
      if (message.type === "error") {
        parserDone = true;
        pumpUploads();
        reject(new Error(message.error));
      }
    };

    worker.onerror = (error) => {
      parserDone = true;
      pumpUploads();
      reject(new Error(error.message || "Excel worker failed"));
    };

    worker.postMessage({ buffer, chunkSize }, [buffer]);
  });

  await uploadPump;
  worker?.terminate();
  emitProgress(onProgress, state, "complete");
  return state;
}

function setBulkImportStatus(text, percent = 0, active = false) {
  const wrap = document.getElementById("bulk-excel-progress");
  const bar = document.getElementById("bulk-excel-progress-bar");
  const label = document.getElementById("bulk-excel-progress-label");
  if (!wrap || !bar || !label) return;
  wrap.style.display = active ? "flex" : "none";
  bar.style.width = `${percent}%`;
  label.textContent = text;
}

function mountBulkImportControls() {
  if (document.getElementById("bulk-excel-input")) return true;

  const searchBar = document.querySelector("#page-records .search-bar");
  if (!searchBar) return false;

  const input = document.createElement("input");
  input.type = "file";
  input.id = "bulk-excel-input";
  input.accept = ".xlsx,.xls,.csv";
  input.style.display = "none";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-green";
  button.textContent = "⚡ Bulk Excel Upload";
  button.onclick = () => input.click();

  const progress = document.createElement("div");
  progress.id = "bulk-excel-progress";
  progress.style.cssText = "display:none;align-items:center;gap:8px;width:100%;font-size:11px;color:var(--text2);font-family:'DM Mono',monospace;";
  progress.innerHTML = '<span id="bulk-excel-progress-label">Preparing...</span><div style="height:5px;flex:1;background:var(--bg3);border-radius:999px;overflow:hidden"><div id="bulk-excel-progress-bar" style="height:100%;width:0;background:var(--green);transition:width .2s"></div></div>';

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    button.disabled = true;
    setBulkImportStatus("Starting bulk upload...", 0, true);

    try {
      const result = await importDealExcelFile(file, {
        onProgress(progressInfo) {
          const phaseLabels = {
            parsing: "Processing Data...",
            uploading: "Uploading File...",
            complete: "Building Dashboard...",
          };
          const label = `${phaseLabels[progressInfo.phase] || "Generating Insights..."} ${progressInfo.uploadedRows.toLocaleString("en-IN")} / ${Math.max(progressInfo.totalRows, progressInfo.parsedRows).toLocaleString("en-IN")} rows`;
          setBulkImportStatus(label, progressInfo.percent, true);
        },
      });
      setBulkImportStatus(`Complete: ${result.insertedRows.toLocaleString("en-IN")} inserted`, 100, true);
      window.refreshDeals?.();
      setTimeout(() => setBulkImportStatus("", 0, false), 2500);
    } catch (error) {
      console.error("Bulk Excel upload failed:", error);
      alert(error.message || "Bulk Excel upload failed");
      setBulkImportStatus("", 0, false);
    } finally {
      input.value = "";
      button.disabled = false;
    }
  });

  searchBar.append(input, button, progress);
  return true;
}

function initBulkImportControls() {
  if (mountBulkImportControls()) return;
  const observer = new MutationObserver(() => {
    if (mountBulkImportControls()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBulkImportControls);
} else {
  initBulkImportControls();
}

window.DealBulkExcelUpload = {
  importFile: importDealExcelFile,
  mountControls: mountBulkImportControls,
};
