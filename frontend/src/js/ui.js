import { g, fmt } from "./helpers.js";

const CALCULATOR_MODULES = {
  "insurance-pro": {
    title: "Insurance Pro Calculator",
    url: "pages/calculator/Insurance_Pro_updated.html",
  },
};

export function loadCalculatorModule(moduleKey) {
  const frame = g("calculator-module-frame");
  const select = g("calculator-module-select");
  if (!frame) return;

  const defaultKey = frame.dataset.defaultModule || "insurance-pro";
  const key = CALCULATOR_MODULES[moduleKey] ? moduleKey : defaultKey;
  const module = CALCULATOR_MODULES[key];

  if (select && select.value !== key) select.value = key;
  if (frame.dataset.loadedModule === key) return;

  frame.title = module.title;
  frame.src = module.url;
  frame.dataset.loadedModule = key;
}

export function bindCalculatorModuleControls() {
  const select = g("calculator-module-select");
  const loadButton = g("calculator-module-load");
  if (!select || !loadButton || loadButton.dataset.bound === "true") return;

  const loadSelectedModule = () => loadCalculatorModule(select.value);
  select.addEventListener("change", loadSelectedModule);
  loadButton.addEventListener("click", loadSelectedModule);
  loadButton.dataset.bound = "true";
}

export function switchTab(app, name) {
  ["new", "records", "summary", "health", "calculator", "tl-report"].forEach((n) => {
    if (g("page-" + n)) g("page-" + n).classList.toggle("active", n === name);
    if (g("nav-" + n)) g("nav-" + n).classList.toggle("active", n === name);
  });
  if (name === "records")
    import("./records.js").then((m) => m.renderRecords(app));
  if (name === "summary")
    import("./summary.js").then((m) => m.renderSummary(app));
  if (name === "health")
    import("./health.js").then((m) => m.fetchHealthStats(app));
  if (name === "calculator") {
    bindCalculatorModuleControls();
    loadCalculatorModule(g("calculator-module-select")?.value);
  }
}

export function updateCounts(app) {
  const n = app.recordsMeta?.total ?? app.DB.length,
    vT = app.DB.reduce((s, d) => s + (d.totalVr || 0), 0),
    bT = app.DB.reduce((s, d) => s + (d.totalAc || 0), 0);
  if (g("record-count")) g("record-count").textContent = n + " Records";
  if (g("nav-badge")) g("nav-badge").textContent = n;
  if (g("sb-total")) g("sb-total").textContent = n;
  if (g("sb-variance")) g("sb-variance").textContent = "₹" + fmt(Math.abs(vT));
  if (g("sb-business")) g("sb-business").textContent = "₹" + fmt(bT);
}

/**
 * Recursive Flattener (Dot Notation)
 */
function flattenObject(obj, prefix = "") {
  let res = {};
  for (let key in obj) {
    let newKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(res, flattenObject(obj[key], newKey));
    } else {
      res[newKey] = obj[key] ?? "";
    }
  }
  return res;
}

/**
 * Export to Excel (SheetJS)
 * Strictly follows the DealTracker Format
 */
export function exportExcel(app) {
  if (typeof XLSX === "undefined") {
    alert("Excel Library not loaded yet.");
    return;
  }

  const exportData = app.DB.map((d) => {
    const row = {
      "Deal ID": d.dealId || "-",
      "Customer_Dealer_Info.Customer Name": d.cname || "-",
      "Customer_Dealer_Info.Customer Number": d.cnum || "-",
      "Customer_Dealer_Info.Dealer Name": d.dname || "-",
      "Customer_Dealer_Info.Dealership Location": d.dlocation || "-",
      "Customer_Dealer_Info.Dealer Code": d.dcode || "-",
      "Customer_Dealer_Info.SC Name & No": d.scname || "-",
      "Customer_Dealer_Info.Model & Variant": d.model || "-",
      "Customer_Dealer_Info.Project Name": d.projectName || "-",
      "Customer_Dealer_Info.Nature": d.nature || "-",
      "Customer_Dealer_Info.Final Decision": d.decision || "-",
      "Customer_Dealer_Info.Mgmt Decision": d.mgmtDecision || "-",

      "Visit_Booking_Info.Date of Visit": d.dvisit || "-",
      "Visit_Booking_Info.Booking Amount": d.booking || 0,
      "Visit_Booking_Info.Booking Date": d.dbooking || "-",
      "Visit_Booking_Info.Delivery Date": d.ddelivery || "-",
      "Visit_Booking_Info.Breach Date": d.dbreach || "-",
      "Visit_Booking_Info.MS Date": d.dms || "-",
      "Visit_Booking_Info.Date of Closed": d.dclosed || "-",
      "Observation Source": d.source || "-",
    };

    // Deal Breakup mapping
    const dealLabels = [
      "Ex Showroom",
      "Registration",
      "Accessories",
      "Insurance",
      "RSA",
      "TCS",
      "Fast Tag",
      "Other",
      "Extended Warranty",
      "Speed Gov",
    ];
    dealLabels.forEach((label, i) => {
      const sb = d.sb?.[i] || 0;
      const ac = d.ac?.[i] || 0;
      row[`Deal_Breakup.${label}.Should Be`] = sb;
      row[`Deal_Breakup.${label}.Actual`] = ac;
      row[`Deal_Breakup.${label}.Variance`] = ac - sb;
    });

    row["Deal_Breakup.Total Deal.Should Be"] = d.totalSb || 0;
    row["Deal_Breakup.Total Deal.Actual"] = d.totalAc || 0;
    row["Deal_Breakup.Total Deal.Variance"] = d.totalVr || 0;

    // Deal_Breakup Discount columns (as requested)
    row["Deal_Breakup.Discount.Should Be"] = d.dSb || 0;
    row["Deal_Breakup.Discount.Actual"] = d.dAc || 0;
    row["Deal_Breakup.Discount.Variance"] = d.dVr || 0;

    // Discount Breakup mapping
    const discLabels = [
      { key: "Cash Disc", label: "Cash Discount" },
      { key: "Acc Disc", label: "Accessories Discount" },
      { key: "Corp Disc", label: "Corporate Discount" },
      { key: "Ins Disc", label: "Insurance Discount" },
      { key: "EW Disc", label: "EW Discount" },
      { key: "Dealer Disc", label: "Dealer Discount" },
      { key: "MS Disc", label: "MS Discount" },
      { key: "Other Disc", label: "Other Discount" },
      { key: "Loyalty Disc", label: "Loyalty Discount" },
    ];

    discLabels.forEach((item, i) => {
      const sb = d.dsb?.[i] || 0;
      const ac = d.dac?.[i] || 0;
      const vr = sb - ac; // Discount variance usually SB - AC

      // Support both naming conventions requested
      row[`Discount_Breakup.${item.key}.Should Be`] = sb;
      row[`Discount_Breakup.${item.key}.Actual`] = ac;
      row[`Discount_Breakup.${item.key}.Variance`] = vr;

      row[`Discount_Breakup.${item.label}.Should Be`] = sb;
      row[`Discount_Breakup.${item.label}.Actual`] = ac;
      row[`Discount_Breakup.${item.label}.Variance`] = vr;
    });

    // Special duplicate Insurance Disc entries requested
    const insIdx = 3;
    row["Discount_Breakup.Insurance Disc.Should Be"] = d.dsb?.[insIdx] || 0;
    row["Discount_Breakup.Insurance Disc.Actual"] = d.dac?.[insIdx] || 0;
    row["Discount_Breakup.Insurance Disc.Variance"] =
      (d.dsb?.[insIdx] || 0) - (d.dac?.[insIdx] || 0);

    row["Discount_Breakup.Total Discount.Should Be"] = d.dSb || 0;
    row["Discount_Breakup.Total Discount.Actual"] = d.dAc || 0;
    row["Discount_Breakup.Total Discount.Variance"] = d.dVr || 0;

    row["Observation_Remarks.Extra Discount"] = d.extraDisc || "-";
    row["Observation_Remarks.Observation Details"] = d.obsDetails || "-";
    row["Observation_Remarks.Management Remarks"] = d.mgmtRemarks || "-";
    row["Observation_Remarks.Additional Remarks"] = d.additionalRemarks || "-";

    // --- SUGGESTED COLUMNS ---
    row["Summary.Total Actual (Lacs)"] = d.totalAc
      ? (d.totalAc / 100000).toFixed(2)
      : "0.00";

    // Count attached files
    const docCount = d.files
      ? Object.values(d.files).filter((v) => v && v !== "").length
      : 0;
    row["Summary.Documents Attached"] = docCount;

    // System Date (Creation Date)
    row["Summary.System Date"] = d.createdAt
      ? new Date(d.createdAt).toLocaleDateString()
      : "-";

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Deals");
  XLSX.writeFile(wb, "DealTrack_Report.xlsx");
}
