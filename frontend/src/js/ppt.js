import { g, fmt, fN } from './helpers.js';

/** Design tokens: Centralized colors and typography for the PPT report */
export const PPT_T = {
  bgSlide: "FFFFFF", bgNavy: "0D1B2A", bgNavyMid: "132337", bgTable: "D6EAF8", bgTableAlt: "FFFFFF",
  bgDisc: "D6EAF8", bgMgmt: "EBF5FB", bgObs: "FFFFFF", bgSummary: "FFF9C4", bgBtnOn: "1A7A45",
  bgBtnOff: "F2F4F4", bdBlack: "000000", bdGrey: "000000", bdBlue: "000000", bdGold: "000000",
  bdTable: "000000", txDark: "000000", txMid: "000000", txLight: "555555", txWhite: "FFFFFF",
  txGold: "C8A96E", txGoldHdr: "AABCCC", txRed: "C0392B", txGreen: "1A7A45", txBlue: "1A5276",
  varPos: "C0392B", varNeg: "1A7A45", varZero: "000000", font: "Calibri",
};

/** Returns a background color (hex) based on the Breach/Not Breach decision */
export function pptDecBg(d) {
  return d === "Breach" ? "C0392B" : d === "Not Breach" ? "1A7A45" : "B7770D";
}

/** Returns the appropriate color for variance values (Red for positive, Green for negative) */
export function pptVarClr(v, T) {
  return v > 0 ? T.varPos : v < 0 ? T.varNeg : T.varZero;
}

/** 
 * Unified Writer: An abstraction layer over PptxGenJS.
 */
export function createPPTWriter(s, pptx, T) {
  return {
    rect: (x, y, w, h, fill, lc) => s.addShape(pptx.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: lc || T.bdBlack, width: 0.5 } }),
    text: (x, y, w, h, txt, o) => s.addText(txt, { x, y, w, h, fontFace: T.font, margin: 0, ...o }),
    richText: (runs, x, y, w, h, o) => s.addText(runs, { x, y, w, h, fontFace: T.font, margin: 0, ...o }),
    line: (x, y, w, h, c) => s.addShape(pptx.shapes.LINE, { x, y, w, h, line: { color: c || "CCCCCC", width: 0.5 } }),
    oval: (x, y, w, h, f, lc) => s.addShape(pptx.shapes.OVAL, { x, y, w, h, fill: { color: f }, line: { color: lc || "FFFFFF", width: 0.8 } })
  };
}

export function drawPPTHeader(w, deal, meta, T) {
  w.rect(0, 0, 13.33, 0.68, T.bgNavy);
  w.rect(0.16, 0.1, 0.46, 0.46, T.txGold);
  w.text(0.16, 0.08, 0.46, 0.5, "🚗", { fontSize: 18, align: "center", valign: "middle" });
  w.text(0.68, 0.09, 2.4, 0.26, "DEALTRACK PRO", { fontSize: 10.5, bold: true, color: T.txWhite });
  w.text(0.68, 0.35, 2.4, 0.2, "Observation Report", { fontSize: 8, color: T.txGoldHdr });
  w.text(3.0, 0.07, 5.6, 0.32, deal.cname || "Unknown", { fontSize: 22, bold: true, color: T.txWhite });
  const sub = [deal.dname, deal.dlocation, deal.dcode].filter(Boolean).join("  ·  ");
  w.text(3.0, 0.4, 5.6, 0.2, sub, { fontSize: 8.5, color: T.txGoldHdr });
  w.rect(9.9, 0.13, 2.0, 0.42, pptDecBg(deal.decision));
  w.text(9.9, 0.13, 2.0, 0.42, (deal.decision === "Not Breach" ? "✓ " : "✗ ") + (deal.decision || "PENDING"), { fontSize: 11, bold: true, color: T.txWhite, align: "center", valign: "middle" });
  w.rect(12.05, 0.1, 1.12, 0.5, "1C3A55", "2A5070");
  w.text(12.05, 0.11, 1.12, 0.18, "SLIDE", { fontSize: 6.5, color: T.txGoldHdr, align: "center" });
  w.text(12.05, 0.28, 1.12, 0.28, `${meta.obsNum}/${meta.obsAll}`, { fontSize: 15, bold: true, color: T.txWhite, align: "center", valign: "middle" });
}

export function drawPPTLeftPanel(w, deal, meta, T) {
  const LX = 0.16, LW = 3.5, COL = { lx: LX, lw: 1.6, sx: LX + 1.6, sw: 0.65, ax: LX + 2.25, aw: 0.62, vx: LX + 2.87, vw: 0.63 };
  let ly = 0.8;
  w.rect(LX, ly, 0.7, 0.24, T.txRed);
  w.text(LX, ly, 0.7, 0.24, "OBS NO", { fontSize: 7, bold: true, color: T.txWhite, align: "center", valign: "middle" });
  w.text(LX + 0.76, ly - 0.02, 0.42, 0.28, meta.obsNum, { fontSize: 17, bold: true, color: T.txDark });
  w.text(LX + 1.2, ly + 0.04, 0.5, 0.2, `of ${meta.obsAll}`, { fontSize: 8.5, color: T.txMid });
  ly += 0.32;
  w.rect(LX, ly, LW, 0.22, "D6EAF8");
  w.text(LX + 0.06, ly, LW - 0.06, 0.22, "OBSERVATION SUMMARY", { fontSize: 7.5, bold: true, color: T.txDark, charSpacing: 0.3, valign: "middle" });
  ly += 0.26;
  const vrStr = "Rs. " + Math.abs(deal.totalVr || 0).toLocaleString("en-IN");
  w.rect(LX, ly, LW, 0.34, T.bgSummary, T.bdGold);
  w.richText([{ text: "Extra Discount Given to Customer of ", options: { color: T.txDark, fontSize: 9.5 } }, { text: vrStr, options: { color: T.txRed, fontSize: 9.5, bold: true } }], LX + 0.08, ly + 0.04, LW - 0.16, 0.26, { valign: "middle" });
  ly += 0.42;
  w.rect(LX, ly, LW, 0.27, T.bgNavy);
  w.text(LX + 0.08, ly, 0.6, 0.27, "DEALER", { fontSize: 7.5, bold: true, color: T.txGoldHdr, valign: "middle" });
  w.text(LX + 0.72, ly, 1.4, 0.27, deal.dname || "—", { fontSize: 8.5, bold: true, color: T.txGold, valign: "middle" });
  w.text(LX + 2.14, ly, 1.2, 0.27, "·  " + (deal.dcode || ""), { fontSize: 8.5, color: T.txGoldHdr, valign: "middle" });
  ly += 0.34;
  w.rect(LX, ly, LW, 0.22, "FCF3CF");
  w.text(LX + 0.06, ly, LW - 0.06, 0.22, "DEAL SHEET", { fontSize: 8.5, bold: true, color: T.txDark, valign: "middle" });
  ly += 0.26;
  const thH = 0.22;
  w.rect(LX, ly, LW, thH, T.bgTable);
  [{ label: "DETAILS", x: COL.lx + 0.06, w: COL.lw, align: "left" }, { label: "STD", x: COL.sx, w: COL.sw, align: "right" }, { label: "ACT", x: COL.ax, w: COL.aw, align: "right" }, { label: "VAR", x: COL.vx, w: COL.vw, align: "right" }].forEach((h) => w.text(h.x, ly, h.w, thH, h.label, { fontSize: 7.5, bold: true, color: T.txDark, valign: "middle", align: h.align }));
  ly += thH;
  let sbT = 0, acT = 0;
  (deal.sb || []).forEach((sbVal, i) => {
    const acVal = (deal.ac || [])[i] || 0, diff = acVal - sbVal;
    sbT += sbVal; acT += acVal;
    w.rect(LX, ly, LW, 0.215, i % 2 === 0 ? T.bgSlide : T.bgTableAlt, T.bdTable);
    w.text(COL.lx + 0.06, ly, COL.lw - 0.06, 0.215, (deal.sbLabels || [])[i] || "Item", { fontSize: 8.5, color: T.txDark, valign: "middle" });
    w.text(COL.sx, ly, COL.sw, 0.215, sbVal ? fN(sbVal) : "0", { fontSize: 8.5, color: T.txMid, align: "right", valign: "middle" });
    w.text(COL.ax, ly, COL.aw, 0.215, acVal ? fN(acVal) : "0", { fontSize: 8.5, color: T.txMid, align: "right", valign: "middle" });
    w.text(COL.vx, ly, COL.vw, 0.215, diff === 0 ? "–" : fN(diff), { fontSize: 8.5, bold: diff !== 0, color: pptVarClr(diff, T), align: "right", valign: "middle" });
    ly += 0.215;
  });
  w.rect(LX, ly, LW, 0.24, "FCF3CF");
  w.text(COL.lx + 0.06, ly, COL.lw, 0.24, "Gross Deal", { fontSize: 8.5, bold: true, color: T.txDark, valign: "middle" });
  w.text(COL.sx, ly, COL.sw, 0.24, fN(sbT), { fontSize: 8.5, bold: true, color: T.txDark, align: "right", valign: "middle" });
  w.text(COL.ax, ly, COL.aw, 0.24, fN(acT), { fontSize: 8.5, bold: true, color: T.txDark, align: "right", valign: "middle" });
  w.text(COL.vx, ly, COL.vw, 0.24, (acT - sbT) === 0 ? "–" : fN(acT - sbT), { fontSize: 8.5, bold: true, color: pptVarClr(acT - sbT, T), align: "right", valign: "middle" });
  ly += 0.24;
  w.rect(LX, ly, LW, 0.2, T.bgDisc, T.bdGrey);
  w.text(LX + 0.06, ly, LW - 0.06, 0.2, "▾  DISCOUNT BREAKUP", { fontSize: 8, bold: true, color: T.txDark, valign: "middle" });
  ly += 0.2;
  (deal.dsb || []).forEach((dsbVal, i) => {
    const dacVal = (deal.dac || [])[i] || 0, diff = dacVal - dsbVal;
    if (dsbVal === 0 && dacVal === 0) return;
    w.rect(LX, ly, LW, 0.215, i % 2 === 0 ? "FAFBFC" : T.bgSlide, T.bdTable);
    w.text(COL.lx + 0.1, ly, COL.lw - 0.1, 0.215, "↳  " + ((deal.discLabels || [])[i] || "Discount"), { fontSize: 8.5, color: T.txMid, valign: "middle" });
    w.text(COL.sx, ly, COL.sw, 0.215, dsbVal ? fN(dsbVal) : "0", { fontSize: 8.5, color: T.txMid, align: "right", valign: "middle" });
    w.text(COL.ax, ly, COL.aw, 0.215, dacVal ? fN(dacVal) : "0", { fontSize: 8.5, color: T.txMid, align: "right", valign: "middle" });
    w.text(COL.vx, ly, COL.vw, 0.215, diff === 0 ? "–" : fN(diff), { fontSize: 8.5, bold: diff !== 0, color: pptVarClr(diff, T), align: "right", valign: "middle" });
    ly += 0.215;
  });
  w.rect(LX, ly, LW, 0.26, "FADBD8");
  w.text(COL.lx + 0.06, ly, COL.lw, 0.26, "NET DEAL", { fontSize: 9.5, bold: true, color: T.txDark, valign: "middle" });
  w.text(COL.sx, ly, COL.sw, 0.26, fN(deal.totalSb || 0), { fontSize: 9.5, bold: true, color: T.txDark, align: "right", valign: "middle" });
  w.text(COL.ax, ly, COL.aw, 0.26, fN(deal.totalAc || 0), { fontSize: 9.5, bold: true, color: T.txDark, align: "right", valign: "middle" });
  w.text(COL.vx, ly, COL.vw, 0.26, fN(Math.abs(deal.totalVr || 0)), { fontSize: 9.5, bold: true, color: T.txRed, align: "right", valign: "middle" });
}

export function drawPPTRightPanel(w, deal, T) {
  // ─── CONSTANTS ───────────────────────────────────────────────────────────────
  const RX = 3.82, RW = 9.35;
  const SMALL_W = 1.6;            // Half-size for first two cols
  const LARGE_W = RW - SMALL_W * 2; // Extra space for Key Details
  const infoH = 1.28;
  let ry = 0.8;

  // ─── SECTION BACKGROUND BOXES (3 columns) ───────────────────────────────────
  [
    { label: "MANAGEMENT REMARKS", x: RX, w: SMALL_W },
    { label: "OBSERVATION SOURCE", x: RX + SMALL_W, w: SMALL_W },
    { label: "KEY DETAILS", x: RX + SMALL_W * 2, w: LARGE_W },
  ].forEach((col) => {
    w.rect(col.x, ry, col.w - 0.06, infoH, T.bgObs, T.bdGrey);
    w.text(col.x + 0.1, ry + 0.06, col.w - 0.24, 0.16, col.label, {
      fontSize: 6.5, bold: true, color: T.txMid, charSpacing: 0.25,
    });
  });

  // ─── MANAGEMENT REMARKS: 3 toggle buttons ───────────────────────────────────
  const mBtnX = RX + 0.1;
  const mBtnW = SMALL_W - 0.26;
  const mBtnH = 0.18;
  const mgmt = deal.mgmtDecision || "";

  ["Accepted", "Contested", "No Remarks"].forEach((opt, i) => {
    const active = mgmt === opt;
    const by = ry + 0.28 + i * 0.32;
    w.rect(mBtnX, by, mBtnW, mBtnH, active ? T.bgNavy : T.bgBtnOff, T.bdBlack);
    w.text(mBtnX, by, mBtnW, mBtnH,
      (active ? "✓ " : "") + opt,
      { fontSize: 7.5, color: active ? T.txWhite : T.txMid, align: "center", valign: "middle" }
    );
  });

  // ─── OBSERVATION SOURCE: 3 toggle buttons ───────────────────────────────────
  const srcX = RX + SMALL_W + 0.1;
  const srcW = SMALL_W - 0.26;

  ["File Audit", "Mystery Shop", "Escalation"].forEach((opt, i) => {
    const active = (deal.source || "") === opt;
    const sy = ry + 0.28 + i * 0.32;
    w.rect(srcX, sy, srcW, mBtnH, active ? T.bgNavy : T.bgBtnOff, T.bdBlack);
    w.text(srcX, sy, srcW, mBtnH,
      (active ? "✓ " : "") + opt,
      { fontSize: 7.5, color: active ? T.txWhite : T.txMid, align: "center", valign: "middle" }
    );
  });

  // ─── KEY DETAILS: 3-column grid of label + value pairs ──────────────────────
  const kx = RX + SMALL_W * 2 + 0.10;
  const kAreaW = LARGE_W - 0.20;
  const thirdW = kAreaW / 3;    // each sub-column width
  const iconW = 0.18;           // icon cell width
  const gap = 0.06;             // gap between icon and text
  const rowH = 0.30;            // vertical step per row

  // Adjust icons if needed for 9 pairs (3 rows * 3 cols)
  const icons = ["🚘", "🏗", "🌿", "👤", "📅", "⚠️", "📦", "📊", "🏷️"];

  const rows = [
    ["MODEL", deal.model || "—", "PROJECT", deal.projectName || "—", "NATURE", deal.nature || "—"],
    ["SC NAME", deal.scname || "—", "BOOKING", deal.dbooking || "—", "BREACH DATE", deal.dbreach || "—"],
    ["DELIVERY", deal.ddelivery || "—", "MS DATE", deal.dms || "—", "", ""],
  ];

  rows.forEach((row, i) => {
    const ky = ry + 0.28 + i * rowH;

    for (let c = 0; c < 3; c++) {
      if (!row[c * 2]) continue; // skip if no label
      const cellX = kx + c * thirdW;
      const txtX = cellX + iconW + gap;
      const txtW = thirdW - iconW - gap - 0.04;

      w.text(cellX, ky, iconW, rowH, icons[i * 3 + c] || "🔹", { fontSize: 9, valign: "middle" });
      w.text(txtX, ky, txtW, 0.13, row[c * 2], { fontSize: 5.5, color: T.txLight, bold: true });
      w.text(txtX, ky + 0.13, txtW, 0.16, row[c * 2 + 1], { fontSize: 8, bold: true, color: T.txDark });
      w.line(txtX, ky + 0.29, txtW, 0, "CCCCCC");
    }
  });

  // ─── ADVANCE ry past top panel ───────────────────────────────────────────────
  ry += infoH + 0.1;

  // ─── LOWER SECTIONS (observation / mgmt / additional — unchanged) ────────────
  const sections = [
    {
      label: "■ OBSERVATION DETAILS",
      bg: "FADBD8",
      boxH: 0.38,
      accent: T.txRed,
      content: deal.obsDetails || "No observation details recorded.",
    },
    {
      label: "■ MANAGEMENT REMARKS",
      bg: "D6EAF8",
      boxH: 0.62,
      accent: T.txBlue,
      content: deal.mgmtRemarks || "No management remarks recorded.",
    },
    {
      label: "— ADDITIONAL REMARKS",
      bg: "D5DBDB",
      boxH: 0.5,
      accent: null,
      content: deal.additionalRemarks || "No additional remarks.",
    },
  ];

  sections.forEach((sec) => {
    w.rect(RX, ry, RW, 0.22, sec.bg);
    w.text(RX + 0.06, ry, RW - 0.06, 0.22, sec.label, {
      fontSize: 8, bold: true, color: T.txDark, charSpacing: 0.2, valign: "middle",
    });
    ry += 0.26;

    w.rect(RX, ry, RW, sec.boxH, sec.bg === "D6EAF8" ? T.bgMgmt : "FFFFFF", T.bdGrey);
    if (sec.accent) w.rect(RX, ry, 0.04, sec.boxH, sec.accent);
    w.text(RX + 0.14, ry + 0.07, RW - 0.18, sec.boxH - 0.1, sec.content, {
      fontSize: 8.5, color: T.txDark, valign: "top", wrap: true,
    });
    ry += sec.boxH + 0.1;
  });

  return ry;
}

export function drawPPTDocsPanel(w, deal, ry, panelHeight, T, DB_FILE_MAP) {
  const RX = 3.82, FX = 11.28, RW = 9.35, docsAreaW = FX - RX - 0.12;
  w.richText([
    { text: '🔗 ', options: { fontSize: 8.5 } },
    { text: 'SUPPORTING DOCUMENTS', options: { color: T.txDark, fontSize: 8, bold: true, charSpacing: 0.2 } },
  ], RX, ry - 0.24, RW, 0.2, { valign: 'middle' });
  w.rect(RX, ry, docsAreaW, panelHeight, "FFFFFF", T.bdGrey);
  const labels = ["Audio", "Video", "Quotation", "Pricelist", "Ledger", "Payment Slip", "Other", "Pay Card"];
  const pids = ["pill-audio", "pill-video", "pill-quot", "pill-price", "pill-ledger", "pill-slip", "pill-other", "pill-paycard"];

  labels.forEach((label, i) => {
    const pid = pids[i];
    const dx = RX + 0.1 + i * 0.76, rawPath = deal.files?.[DB_FILE_MAP[pid]];
    const link = rawPath ? { url: rawPath.startsWith("http") ? rawPath : `${window.location.origin}/${rawPath.replace(/^\//, "")}` } : null;
    w.rect(dx, ry + 0.14, 0.68, 0.54, link ? "EAF4FF" : "F7F9FB", T.bdGrey);
    w.text(dx, ry + 0.14, 0.68, 0.54, "📎", { fontSize: 13, align: "center", valign: "middle", hyperlink: link });
    if (link) w.oval(dx + 0.68 - 0.13, ry + 0.14, 0.13, 0.13, "22C55E");
    w.text(dx - 0.04, ry + 0.14 + 0.54 + 0.04, 0.68 + 0.08, 0.16, label, { fontSize: 6.5, color: T.txLight, align: "center" });
  });
  w.text(RX, ry + 0.14 + 0.54 + 0.24, docsAreaW, 0.15, "ⓘ  Press F5 → Slide Show mode, then click icons to open documents", { fontSize: 6.2, color: "555555", italic: true, align: "center" });
}

export function drawPPTDecisionPanel(w, deal, ry, panelHeight, T) {
  const FX = 11.28, FW = 1.89;
  w.rect(FX - 0.04, ry - 0.04, FW + 0.08, panelHeight + 0.08, "FFFFFF", "2ECC71");
  w.rect(FX, ry, FW, 0.28, T.bgNavy);
  w.text(FX, ry, FW, 0.28, "FINAL DECISION", { fontSize: 8, bold: true, color: T.txWhite, align: "center", valign: "middle" });
  ["Breach", "Not Breach", "Hold"].forEach((opt, i) => {
    const fy = ry + 0.28 + 0.06 + i * 0.36, sel = deal.decision === opt, clr = pptDecBg(opt), cbW = 0.28;
    w.rect(FX, fy, FW - cbW, 0.3, sel ? clr : "FFFFFF", sel ? clr : T.bdGrey);
    w.text(FX + 0.08, fy, FW - cbW - 0.1, 0.3, opt, { fontSize: 9.5, bold: sel, color: sel ? T.txWhite : T.txMid, valign: "middle" });
    w.rect(FX + FW - cbW, fy, cbW, 0.3, sel ? clr : "F0F4F8", sel ? clr : T.bdGrey);
    w.text(FX + FW - cbW, fy, cbW, 0.3, sel ? "✓" : "✗", { fontSize: 10, bold: true, color: sel ? T.txWhite : T.txLight, align: "center", valign: "middle" });
  });
}

export function drawPPTFooter(w, deal, meta, T) {
  w.rect(0, 7.22, 13.33, 0.28, T.bgNavy);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  w.text(0.18, 7.22, 5.5, 0.28, `Generated by DealTrack Pro  ·  ${today}`, { fontSize: 7.5, color: T.txGoldHdr, valign: "middle" });
  w.text(4.8, 7.22, 5.5, 0.28, `Dealer Code: ${deal.dcode || "—"}  ·  SC: ${deal.scname || "—"}`, { fontSize: 7.5, color: T.txGoldHdr, align: "center", valign: "middle" });
  w.text(11.5, 7.22, 1.65, 0.28, `Obs  ${meta.obsNum} / ${meta.obsAll}`, { fontSize: 7.5, color: T.txGoldHdr, align: "right", valign: "middle" });
}

export async function generatePPT(DB, DB_FILE_MAP) {
  if (typeof PptxGenJS === "undefined") { alert("Error: PowerPoint library not loaded."); return; }
  try {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    if (!DB || DB.length === 0) { alert("No deal records available for export."); return; }

    const sharedPanelHeight = 0.28 + 0.06 + (3 * 0.3) + (2 * 0.06) + 0.04;

    DB.forEach((deal, idx) => {
      const s = pptx.addSlide();
      s.background = { color: PPT_T.bgSlide };
      const w = createPPTWriter(s, pptx, PPT_T);
      const meta = { obsNum: String(idx + 1).padStart(2, "0"), obsAll: String(DB.length).padStart(2, "0") };
      drawPPTHeader(w, deal, meta, PPT_T);
      drawPPTLeftPanel(w, deal, meta, PPT_T);
      drawPPTRightPanel(w, deal, PPT_T);

      const finalPanelY = 7.22 - sharedPanelHeight - 0.20;
      drawPPTDocsPanel(w, deal, finalPanelY, sharedPanelHeight, PPT_T, DB_FILE_MAP);
      drawPPTDecisionPanel(w, deal, finalPanelY, sharedPanelHeight, PPT_T);
      drawPPTFooter(w, deal, meta, PPT_T);
    });

    pptx.writeFile({ fileName: "DealTrack_Report.pptx" }).then(() => console.log("PPT Downloaded"));
  } catch (err) { console.error("PPT Generation Error:", err); }
}