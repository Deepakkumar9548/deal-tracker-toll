import { g, gv, fmt, num, setVal, vrColor } from './helpers.js';

export function pillDone(app, id, input) {
  if (!input.files?.length) return;
  const file = input.files[0];
  const pill = g(id);
  if (!pill) return;
  pill.classList.add("done");
  const dot = pill.querySelector(".pill-dot");
  if (dot) {
    dot.style.cssText = "background:none; font-size:11px; font-weight:700; width:auto; height:auto; border-radius:0";
    dot.textContent = "✓";
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    app.currentUploadedDocs = app.currentUploadedDocs.filter((d) => d.pillId !== id);
    app.currentUploadedDocs.push({
      pillId: id,
      label: app.PILL_META[id] || id,
      fileName: file.name,
      dataUrl: e.target.result,
      file: file,
    });
  };
  reader.readAsDataURL(file);
}

export function updateObsText() {
  const sbs = document.querySelectorAll(".sb"), acs = document.querySelectorAll(".ac");
  let sbT = 0, acT = 0;
  sbs.forEach((el, i) => { sbT += num(el); acT += num(acs[i]); });
  const dSb = num(g("disc-sb")), dAc = num(g("disc-ac"));
  const totalVr = acT - dAc - (sbT - dSb);
  const totalAc = acT - dAc;
  const vrDisplay = totalVr !== 0 ? "₹" + Math.abs(totalVr).toLocaleString("en-IN") : "₹0";
  const acLacsDisplay = totalAc > 0 ? "₹" + (totalAc / 100000).toFixed(2) : "₹0.00";
  if (g("obs-dyn-variance1")) g("obs-dyn-variance1").textContent = vrDisplay;
  if (g("obs-dyn-variance2")) g("obs-dyn-variance2").textContent = vrDisplay;
  if (g("obs-dyn-actual")) g("obs-dyn-actual").textContent = acLacsDisplay;
  if (g("f-extraDisc")) g("f-extraDisc").value = totalVr;
}

export function calcDisc(app) {
  let sbT = 0, acT = 0;
  const rows = g("disc-tbody").querySelectorAll("tr");
  rows.forEach((tr) => {
    const sb = num(tr.querySelector(".dsb")), ac = num(tr.querySelector(".dac")), diff = ac - sb;
    const vrEl = tr.querySelector(".vr") || tr.querySelector(".vr-disc");
    if (vrEl) {
      vrEl.value = (sb === 0 && ac === 0) || diff === 0 ? "-" : fmt(diff);
      vrEl.style.color = vrColor(diff);
    }
    sbT += sb; acT += ac;
  });
  setVal("disc-total-sb", sbT);
  setVal("disc-total-ac", acT);
  const vr = acT - sbT;
  if (g("disc-total-vr")) {
    g("disc-total-vr").value = vr === 0 ? "-" : fmt(vr);
    g("disc-total-vr").style.color = vrColor(vr);
  }
  if (g("disc-variance")) g("disc-variance").value = vr === 0 ? "-" : fmt(vr);

  if (g("disc-sb")) g("disc-sb").value = sbT > 0 ? sbT : "";
  if (g("disc-ac")) g("disc-ac").value = acT > 0 ? acT : "";
  calcDeal();
}

export function calcDeal() {
  let sbT = 0, acT = 0;
  const rows = g("deal-tbody").querySelectorAll("tr");
  rows.forEach((tr) => {
    const sb = num(tr.querySelector(".sb")), ac = num(tr.querySelector(".ac")), diff = ac - sb;
    const vrEl = tr.querySelector(".vr");
    if (vrEl) {
      vrEl.value = (sb === 0 && ac === 0) || diff === 0 ? "-" : fmt(diff);
      vrEl.style.color = vrColor(diff);
    }
    sbT += sb; acT += ac;
  });
  setVal("deal-sb-total", sbT);
  setVal("deal-ac-total", acT);
  if (g("deal-vr-total")) {
    g("deal-vr-total").value = acT - sbT === 0 ? "-" : fmt(acT - sbT);
    g("deal-vr-total").style.color = vrColor(acT - sbT);
  }
  const dSb = num(g("disc-sb")), dAc = num(g("disc-ac")), discVr = dAc - dSb;
  if (g("disc-vr")) g("disc-vr").value = discVr === 0 ? "-" : fmt(discVr);
  const tSb = sbT - dSb, tAc = acT - dAc, totalVr = tAc - tSb;
  setVal("total-sb", tSb);
  setVal("total-ac", tAc);
  if (g("total-vr")) {
    g("total-vr").value = totalVr === 0 ? "-" : fmt(Math.abs(totalVr));
    g("total-vr").style.color = vrColor(totalVr);
  }
  updateObsText();
}

export function getFormData(app) {
  const sb = [], ac = [], sbLabels = [];
  g("deal-tbody").querySelectorAll("tr").forEach((tr) => {
    sbLabels.push(tr.getAttribute("data-label") || "");
    sb.push(num(tr.querySelector(".sb")));
    ac.push(num(tr.querySelector(".ac")));
  });
  const dsb = [], dac = [], discLabels = [];
  g("disc-tbody").querySelectorAll("tr").forEach((tr) => {
    discLabels.push(tr.getAttribute("data-label") || "");
    dsb.push(num(tr.querySelector(".dsb")));
    dac.push(num(tr.querySelector(".dac")));
  });
  const dSb = num(g("disc-sb")), dAc = num(g("disc-ac")), sbT = sb.reduce((a, b) => a + b, 0), acT = ac.reduce((a, b) => a + b, 0);
  const totalSb = sbT - dSb, totalAc = acT - dAc, totalVr = totalAc - totalSb;

  return {
    id: app.currentDealId,
    dealId: app.currentDealId ? gv("f-dealId") : undefined,
    cname: gv("f-cname"), cnum: gv("f-cnum"), dname: gv("f-dname"), dlocation: gv("f-dlocation"),
    dcode: gv("f-dcode"), scname: gv("f-scname"), model: gv("f-model"), projectName: gv("f-projectName"), nature: gv("f-nature"),
    decision: gv("f-decision"), mgmtDecision: gv("f-mgmt-decision"), source: gv("f-source"),
    dvisit: gv("f-dvisit"), booking: gv("f-booking"), dbooking: gv("f-dbooking"), ddelivery: gv("f-ddelivery"),
    dbreach: gv("f-dbreach"), dms: gv("f-dms"), dclosed: gv("f-dclosed"),
    extraDisc: gv("f-extraDisc"), obsDetails: gv("f-obsDetails"), mgmtRemarks: gv("f-mgmtRemarks"), additionalRemarks: gv("f-additionalRemarks"),
    sb, ac, sbLabels,
    dealSb: sbT, dealAc: acT, dealVr: acT - sbT,
    dSb, dAc, dVr: dAc - dSb,
    dsb, dac, discLabels,
    totalSb, totalAc, totalVr
  };
}

export function clearForm(app) {
  app.currentDealId = null;
  app.currentUploadedDocs = [];
  document.querySelectorAll(".main input, .main textarea, .main select").forEach((el) => { el.value = ""; });

  // Clear Deal ID field (will be assigned by backend)
  if (g("f-dealId")) g("f-dealId").value = "";

  document.querySelectorAll(".upload-pill").forEach((p) => {
    p.classList.remove("done");
    const dot = p.querySelector(".pill-dot");
    if (dot) { dot.style.cssText = ""; dot.textContent = ""; }
  });
  calcDeal();
  if (g("save-btn")) g("save-btn").innerHTML = "✅ Save Deal";
}

export async function saveRecord(app) {
  const d = getFormData(app);
  if (!d.cname) {
    alert("❗ Customer name required!");
    return;
  }
  try {
    const isEdit = !!d.id;
    const url = isEdit ? `${app.API_URL}/${d.id}` : app.API_URL;
    const formData = new FormData();
    formData.append("data", JSON.stringify(d));
    app.currentUploadedDocs.forEach((doc) => {
      if (doc.file) formData.append(doc.pillId, doc.file);
    });
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || "Save failed");
    }
    import('./records.js').then(m => m.fetchDeals(app));
    clearForm(app);
    alert(isEdit ? "✅ Updated!" : "✅ Saved!");
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}

export function loadRecord(app, id) {
  clearForm(app);
  const d = app.DB.find((r) => r.id === id);
  if (!d) return;
  app.currentDealId = d.id;
  if (g("save-btn")) g("save-btn").innerHTML = "🔄 Update Deal";
  const fields = ["dealId", "cname", "cnum", "dname", "dlocation", "dcode", "scname", "model", "dvisit", "booking", "dbooking", "ddelivery", "dbreach", "dms", "dclosed", "extraDisc", "obsDetails", "mgmtRemarks", "additionalRemarks"];
  fields.forEach((f) => { if (g("f-" + f)) g("f-" + f).value = d[f] || ""; });

  // Select fields (ensuring correct ID mapping)
  if (g("f-projectName")) g("f-projectName").value = d.projectName || "";
  if (g("f-nature")) g("f-nature").value = d.nature || "";
  if (g("f-decision")) g("f-decision").value = d.decision || "";
  if (g("f-mgmt-decision")) g("f-mgmt-decision").value = d.mgmtDecision || "";
  if (g("f-source")) g("f-source").value = d.source || "";

  const tbody = g("deal-tbody"), trs = tbody.querySelectorAll("tr");
  trs.forEach((tr, i) => {
    const sbEl = tr.querySelector(".sb"), acEl = tr.querySelector(".ac");
    if (sbEl) sbEl.value = d.sb?.[i] || "";
    if (acEl) acEl.value = d.ac?.[i] || "";
  });
  const dtbody = g("disc-tbody"), dtrs = dtbody.querySelectorAll("tr");
  dtrs.forEach((tr, i) => {
    const dsbEl = tr.querySelector(".dsb"), dacEl = tr.querySelector(".dac");
    if (dsbEl) dsbEl.value = d.dsb?.[i] || "";
    if (dacEl) dacEl.value = d.dac?.[i] || "";
  });
  g("disc-sb").value = d.dSb || "";
  g("disc-ac").value = d.dAc || "";
  calcDisc(app);
  app.currentUploadedDocs = [];
  Object.keys(app.PILL_META).forEach((pid) => {
    const p = g(pid);
    if (!p) return;
    p.classList.remove("done");
    const dot = p.querySelector(".pill-dot");
    if (dot) { dot.style.cssText = ""; dot.textContent = ""; }
    const dbKey = app.DB_FILE_MAP[pid];
    if (d.files && d.files[dbKey]) {
      p.classList.add("done");
      if (dot) {
        dot.style.cssText = "background:none; font-size:11px; font-weight:700; width:auto; height:auto; border-radius:0";
        dot.textContent = "✓";
      }
    }
  });
  import('./ui.js').then(m => m.switchTab(app, "new"));
}
