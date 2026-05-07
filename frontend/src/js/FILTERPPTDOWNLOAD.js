import { generatePPT } from "./ppt.js";

const BUTTON_ID = "download-filtered-ppt";
const RECORDS_CONTAINER_ID = "records-container";
const API_URL = "/api/deals";
const DB_FILE_MAP = {
  "pill-audio": "audioUpload",
  "pill-video": "videoUpload",
  "pill-quot": "quotation",
  "pill-price": "pricelist",
  "pill-ledger": "ledger",
  "pill-slip": "paymentSlip",
  "pill-other": "other",
  "pill-paycard": "paymentCard",
};

function getRecordsContainer() {
  return document.getElementById(RECORDS_CONTAINER_ID);
}

function getVisibleFilteredRecordIds() {
  const container = getRecordsContainer();
  if (!container) return [];

  return Array.from(container.querySelectorAll(".records-table tbody tr"))
    .filter((row) => row.offsetParent !== null && !row.querySelector(".empty"))
    .map((row) => {
      const clickHandler = row.getAttribute("onclick") || "";
      const match = clickHandler.match(/loadRecord\(['"]([^'"]+)['"]\)/);
      return match ? match[1] : "";
    })
    .filter(Boolean);
}

async function fetchAllRecords() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Unable to load records. Status: ${response.status}`);
  }

  const records = await response.json();
  return records.map((record) => ({
    ...record,
    id: record._id || record.id,
    dealId: record.dealId || "-",
  }));
}

function sortRecordsByVisibleOrder(records, visibleIds) {
  const recordMap = new Map(records.map((record) => [record.id, record]));
  return visibleIds.map((id) => recordMap.get(id)).filter(Boolean);
}

async function getFilteredRecordsForPPT() {
  const visibleIds = getVisibleFilteredRecordIds();
  if (!visibleIds.length) return [];

  const records = await fetchAllRecords();
  return sortRecordsByVisibleOrder(records, visibleIds);
}

function setButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  button.dataset.originalText ||= button.textContent;
  button.textContent = isLoading ? "Generating..." : button.dataset.originalText;
}

async function downloadFilteredPPT() {
  const button = document.getElementById(BUTTON_ID);

  try {
    if (button) setButtonLoading(button, true);

    if (typeof PptxGenJS === "undefined") {
      alert("Error: PowerPoint library not loaded.");
      return;
    }

    const filteredRecords = await getFilteredRecordsForPPT();
    if (!filteredRecords.length) {
      alert("No filtered records available for PPT export.");
      return;
    }

    await generatePPT(filteredRecords, DB_FILE_MAP);
  } catch (error) {
    console.error("Filtered PPT generation failed:", error);
    alert("Unable to generate filtered PPT. Please try again.");
  } finally {
    if (button) setButtonLoading(button, false);
  }
}

function createFilteredPPTButton() {
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "btn btn-save";
  button.textContent = "📊 FILTER PPT DOWNLOAD";
  bindFilteredPPTButton(button);
  return button;
}

function bindFilteredPPTButton(button) {
  if (!button || button.dataset.filteredPptBound === "true") return;
  button.addEventListener("click", downloadFilteredPPT);
  button.dataset.filteredPptBound = "true";
}

function mountFilteredPPTButton() {
  const existingButton = document.getElementById(BUTTON_ID);
  if (existingButton) {
    bindFilteredPPTButton(existingButton);
    return true;
  }

  const recordsPage = document.getElementById("page-records");
  const searchBar = recordsPage?.querySelector(".search-bar");
  if (!searchBar) return false;

  searchBar.appendChild(createFilteredPPTButton());
  return true;
}

function initFilteredPPTDownload() {
  if (mountFilteredPPTButton()) return;

  const observer = new MutationObserver(() => {
    if (mountFilteredPPTButton()) observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFilteredPPTDownload);
} else {
  initFilteredPPTDownload();
}

window.FilteredPPTDownload = {
  download: downloadFilteredPPT,
  getFilteredRecordsForPPT,
  getVisibleFilteredRecordIds,
  mountButton: mountFilteredPPTButton,
};
