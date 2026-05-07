import { g, fmt, decBadge, vrColor } from './helpers.js';
import { updateCounts } from './ui.js';

const DEFAULT_PAGE_SIZE = 100;
let searchTimer = null;

export async function fetchDeals(app, options = {}) {
  try {
    app.recordsMeta = app.recordsMeta || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 };
    const page = options.page || app.recordsMeta.page || 1;
    const limit = options.limit || app.recordsMeta.limit || DEFAULT_PAGE_SIZE;
    const search = options.search ?? (g("search-inp")?.value || "");
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());

    const res = await fetch(`${app.API_URL}?${params.toString()}`);
    const payload = await res.json();
    const records = Array.isArray(payload) ? payload : payload.data || [];
    app.recordsMeta = payload.meta || {
      page,
      limit,
      total: records.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
    app.DB = records.map((d) => ({
      ...d,
      id: d._id,
      dealId: d.dealId || "-"
    }));
    if (!app.selectedDealIds) app.selectedDealIds = new Set();
    app.bulkEditMode = !!app.bulkEditMode;
    const validIds = new Set(app.DB.map((d) => d.id));
    app.selectedDealIds.forEach((id) => {
      if (!validIds.has(id)) app.selectedDealIds.delete(id);
    });
    updateCounts(app);
    updateCounts(app);
    if (g("page-records")?.classList.contains("active")) renderRecords(app);
    if (g("page-summary")?.classList.contains("active")) import('./summary.js').then(m => m.renderSummary(app));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

export function scheduleFetchDeals(app) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchDeals(app, { page: 1 }), 250);
}

export function renderRecords(app) {
  const container = g("records-container");
  if (!container) return;
  if (!app.selectedDealIds) app.selectedDealIds = new Set();
  app.bulkEditMode = !!app.bulkEditMode;
  syncBulkEditControls(app);

  // 1. Safety check for data
  if (!app.DB || !Array.isArray(app.DB)) {
    container.innerHTML = '<div class="empty">Loading records...</div>';
    return;
  }

  const q = (g("search-inp")?.value || "").toLowerCase();
  
  // 2. Collect column filters from existing inputs
  const colFilters = {};
  container.querySelectorAll(".col-filter").forEach(inp => {
    colFilters[inp.dataset.col] = inp.value.toLowerCase();
  });

  // 3. Filtering logic
  const list = app.DB.filter((d) => {
    const matchGlobal = !q || [d.dealId, d.cname, d.model, d.dname, d.dcode, d.decision, d.projectName]
      .map(v => String(v ?? "").toLowerCase())
      .some(v => v.includes(q));
    
    if (!matchGlobal) return false;

    return Object.entries(colFilters).every(([col, val]) => {
      if (!val) return true;
      let fv = "";
      if (col === "docs") fv = (d.files && Object.keys(d.files).length > 0) ? "yes" : "no";
      else if (col === "std") fv = String(d.totalSb ?? "");
      else if (col === "act") fv = String(d.totalAc ?? "");
      else if (col === "variance") fv = String(d.totalVr ?? "");
      else if (col === "contact") fv = String(d.cnum ?? "");
      else fv = String(d[col] ?? "").toLowerCase();
      return fv.includes(val);
    });
  });

  // 4. Generate Rows
  const rows = list.map((d) => {
    const hasDocs = d.files && Object.keys(d.files).length > 0;
    const docStatus = hasDocs ? "✅ Yes" : "❌ No";
    const proofLink = hasDocs ? `<a href="#" class="view-link" onclick="event.stopPropagation(); app.viewFirstDoc('${d.id}')">View</a>` : "-";
    const checked = app.selectedDealIds.has(d.id) ? "checked" : "";
    const checkboxState = app.bulkEditMode ? "" : 'disabled tabindex="-1" aria-hidden="true"';
    const rowClasses = [
      d.id === app.currentDealId ? "active" : "",
      app.selectedDealIds.has(d.id) ? "selected" : "",
    ].filter(Boolean).join(" ");
    
    return `
      <tr onclick="${app.bulkEditMode ? `app.toggleRecordSelection('${d.id}')` : `app.loadRecord('${d.id}')`}" class="${rowClasses}">
        <td class="select-cell">
          <input type="checkbox" class="record-select" value="${d.id}" ${checked}
            ${checkboxState}
            onclick="event.stopPropagation()"
            onchange="app.toggleRecordSelection('${d.id}', this.checked)">
        </td>
        <td><span class="id-tag">${d.dealId || "-"}</span></td>
        <td>${d.projectName || "-"}</td>
        <td>${d.dname || "-"}</td>
        <td>${d.dlocation || "-"}</td>
        <td>${d.dvisit || "-"}</td>
        <td><strong>${d.cname || "-"}</strong></td>
        <td>${d.cnum || "-"}</td>
        <td>${d.model || "-"}</td>
        <td>${d.variant || (d.model ? d.model.split(" ").pop() : "") || "-"}</td>
        <td>${d.scname || "-"}</td>
        <td class="mono">₹${fmt(d.totalSb)}</td>
        <td class="mono">₹${fmt(d.totalAc)}</td>
        <td class="mono" style="color:${vrColor(d.totalVr)}">₹${fmt(d.totalVr)}</td>
        <td>${decBadge(d.decision)}</td>
        <td style="text-align:center">${docStatus}</td>
        <td>${proofLink}</td>
        <td><button class="btn btn-del" onclick="event.stopPropagation(); app.deleteRecord('${d.id}')">🗑</button></td>
      </tr>`;
  }).join("");

  // 5. Generate Header
  const headers = [
    { label: "Select", col: "select" },
    { label: "Deal ID", col: "dealId" }, { label: "Project Name", col: "projectName" },
    { label: "Dealership Name", col: "dname" }, { label: "Location", col: "dlocation" },
    { label: "Visit Date", col: "dvisit" }, { label: "Customer Name", col: "cname" },
    { label: "Customer Contact Number", col: "contact" }, { label: "Model", col: "model" },
    { label: "Variant", col: "variant" }, { label: "Sales Consultant Name", col: "scname" },
    { label: "Standard Deal Amount", col: "std" }, { label: "Actual Deal Amount", col: "act" },
    { label: "Variance", col: "variance" }, { label: "Breach/No Breach", col: "decision" },
    { label: "Document (Yes/No)", col: "docs" }, { label: "Proof Link", col: "proof" },
    { label: "", col: "action" }
  ];

  const headerHtml = `
    <thead>
      <tr>${headers.map(h => {
        if (h.col === "select") {
          const allVisibleSelected = list.length > 0 && list.every((d) => app.selectedDealIds.has(d.id));
          const checkboxState = app.bulkEditMode ? "" : 'disabled tabindex="-1" aria-hidden="true"';
          return `<th class="select-cell"><input type="checkbox" class="select-all-records" ${allVisibleSelected ? "checked" : ""} ${checkboxState} onchange="app.toggleVisibleRecordsSelection(this.checked)"></th>`;
        }
        return `<th>${h.label}</th>`;
      }).join("")}</tr>
      <tr class="filter-row">
        ${headers.map(h => (h.col !== "action" && h.col !== "proof" && h.col !== "select") ?
          `<td><input type="text" class="col-filter" data-col="${h.col}" placeholder="Filter..." value="${colFilters[h.col] || ""}" oninput="renderRecords()"></td>` :
          `<td></td>`).join("")}
      </tr>
    </thead>`;

  // 6. Update DOM
  const table = container.querySelector(".records-table");
  const paginationHtml = renderPagination(app);
  if (!table) {
    if (!list.length && Object.keys(colFilters).length === 0) {
      container.innerHTML = '<div class="empty">No records found</div>';
    } else {
      container.innerHTML = `<div class="table-wrapper"><table class="records-table ${app.bulkEditMode ? "bulk-mode" : ""}">${headerHtml}<tbody>${rows}</tbody></table></div>${paginationHtml}`;
    }
  } else {
    table.classList.toggle("bulk-mode", app.bulkEditMode);
    table.querySelector("thead").innerHTML = headerHtml.replace(/<\/?thead>/g, "");
    table.querySelector("tbody").innerHTML = rows || '<tr><td colspan="18" class="empty">No results match filters</td></tr>';
    const oldPager = container.querySelector(".records-pagination");
    if (oldPager) oldPager.outerHTML = paginationHtml;
    else container.insertAdjacentHTML("beforeend", paginationHtml);
  }
}

function renderPagination(app) {
  const meta = app.recordsMeta || {};
  const page = meta.page || 1;
  const totalPages = meta.totalPages || 1;
  const total = meta.total || app.DB.length;
  const start = total ? ((page - 1) * (meta.limit || DEFAULT_PAGE_SIZE)) + 1 : 0;
  const end = Math.min(page * (meta.limit || DEFAULT_PAGE_SIZE), total);

  return `
    <div class="records-pagination">
      <span>${start.toLocaleString("en-IN")}-${end.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}</span>
      <button class="btn btn-edit" type="button" ${page <= 1 ? "disabled" : ""} onclick="app.goToRecordsPage(${page - 1})">Prev</button>
      <span>Page ${page.toLocaleString("en-IN")} / ${totalPages.toLocaleString("en-IN")}</span>
      <button class="btn btn-edit" type="button" ${page >= totalPages ? "disabled" : ""} onclick="app.goToRecordsPage(${page + 1})">Next</button>
    </div>`;
}

export function goToRecordsPage(app, page) {
  fetchDeals(app, { page });
}

function syncBulkEditControls(app) {
  const bulkBtn = g("btn-bulk-edit");
  const deleteBtn = g("delete-multiple-btn");
  const selectedCount = app.selectedDealIds?.size || 0;

  if (bulkBtn) {
    bulkBtn.classList.toggle("active", !!app.bulkEditMode);
    bulkBtn.textContent = app.bulkEditMode ? "Close Bulk Edit" : "🗄️ Bulk Edit";
  }
  if (deleteBtn) {
    deleteBtn.classList.toggle("is-hidden", !app.bulkEditMode);
    deleteBtn.disabled = selectedCount === 0;
    deleteBtn.textContent = selectedCount > 0 ? `Delete Selected (${selectedCount})` : "Delete Selected";
  }
}

export function toggleBulkEditMode(app, force) {
  if (!app.selectedDealIds) app.selectedDealIds = new Set();
  app.bulkEditMode = typeof force === "boolean" ? force : !app.bulkEditMode;
  if (!app.bulkEditMode) app.selectedDealIds.clear();
  syncBulkEditControls(app);
  renderRecords(app);
}

export function toggleRecordSelection(app, id, checked) {
  if (!app.selectedDealIds) app.selectedDealIds = new Set();
  const shouldSelect = typeof checked === "boolean" ? checked : !app.selectedDealIds.has(id);
  if (shouldSelect) app.selectedDealIds.add(id);
  else app.selectedDealIds.delete(id);
  syncBulkEditControls(app);
  renderRecords(app);
}

export function toggleVisibleRecordsSelection(app, checked) {
  if (!app.selectedDealIds) app.selectedDealIds = new Set();
  document.querySelectorAll("#records-container .record-select").forEach((input) => {
    if (checked) app.selectedDealIds.add(input.value);
    else app.selectedDealIds.delete(input.value);
  });
  syncBulkEditControls(app);
  renderRecords(app);
}

export async function deleteSelectedRecords(app) {
  if (!app.selectedDealIds || app.selectedDealIds.size === 0) {
    alert("Please select at least one deal to delete.");
    return;
  }
  const count = app.selectedDealIds.size;
  if (!confirm(`Delete ${count} selected deal${count === 1 ? "" : "s"}?`)) return;
  try {
    const results = await Promise.all(
      [...app.selectedDealIds].map((id) =>
        fetch(`${app.API_URL}/${id}`, { method: "DELETE" }),
      ),
    );
    const failed = results.find((res) => !res.ok);
    if (failed) throw new Error("One or more selected records could not be deleted.");
    app.selectedDealIds.clear();
    app.bulkEditMode = false;
    syncBulkEditControls(app);
    await fetchDeals(app);
  } catch (err) {
    alert("❌ Error deleting selected records");
  }
}

export async function deleteRecord(app, id) {
  if (!confirm("Delete?")) return;
  try {
    await fetch(`${app.API_URL}/${id}`, { method: "DELETE" });
    await fetchDeals(app);
  } catch (err) {
    alert("❌ Error");
  }
}
