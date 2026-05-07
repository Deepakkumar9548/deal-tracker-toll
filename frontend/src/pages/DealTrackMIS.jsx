import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from "recharts";

// ─── SEED DATA (mirrors Excel schema) ──────────────────────────────────────
const MODELS = ["Swift", "Baleno", "Brezza", "Ertiga", "Ciaz", "Dzire", "Grand Vitara", "Fronx", "Jimny"];
const VARIANTS = ["LXi", "VXi", "ZXi", "ZXi+", "Alpha", "Delta", "Sigma", "Zeta"];
const DEALERS = ["Krishna Motors", "Shiva Auto", "Ganga Cars", "Lotus Wheels", "Sunrise Motors", "Royal Drive", "Metro Cars", "City Auto"];
const LOCATIONS = ["Delhi", "Mumbai", "Pune", "Bangalore", "Chennai", "Hyderabad", "Ahmedabad", "Jaipur"];
const CONSULTANTS = ["Anil Sharma", "Priya Mehta", "Rajesh Kumar", "Sunita Verma", "Deepak Singh", "Pooja Nair", "Suresh Patel", "Kavita Joshi"];
const NATURES = ["Retail", "Corporate", "Fleet"];
const DECISIONS = ["Breach", "Not Breach", "Hold"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }

const RAW = Array.from({ length: 120 }, (_, i) => {
  const model = pick(MODELS), variant = pick(VARIANTS);
  const exSb = rnd(500000, 1800000), regSb = rnd(20000, 120000), accSb = rnd(5000, 80000);
  const insSb = rnd(15000, 60000), totalSb = exSb + regSb + accSb + insSb;
  const variance = rnd(-180000, 80000);
  const totalAc = totalSb + variance;
  const decision = variance < -50000 ? "Breach" : variance < 0 ? "Not Breach" : "Hold";
  const mon = rnd(0, 11), yr = 2025;
  const dov = new Date(yr, mon, rnd(1, 28));
  const dob = new Date(dov.getTime() + rnd(1, 10) * 86400000);
  return {
    id: `${i + 1}`,
    dealId: `DL-${2001 + i}`,
    projectName: pick(["Project Alpha", "Project Beta", "Project Gamma", "MIS Q1", "MIS Q2", "-"]),
    cname: ["Rahul Sharma", "Priya Singh", "Amit Kumar", "Sneha Gupta", "Raj Patel", "Meena Verma", "Suresh Nair", "Anita Joshi", "Vikas Dubey", "Seema Khanna"][i % 10],
    cnum: `98${rnd(10000000, 99999999)}`,
    dname: DEALERS[i % DEALERS.length],
    dlocation: LOCATIONS[i % LOCATIONS.length],
    dcode: `DC${100 + i % 20}`,
    scname: CONSULTANTS[i % CONSULTANTS.length],
    model, variant,
    nature: pick(NATURES),
    decision,
    mgmtDecision: rnd(0, 1) ? "Approved" : "Pending",
    dov: dov.toISOString().split("T")[0],
    dob: dob.toISOString().split("T")[0],
    bookingAmt: rnd(10000, 50000),
    totalSb, totalAc, totalVr: variance,
    exSb, regSb, accSb, insSb,
    cashDisc: rnd(0, 30000),
    accDisc: rnd(0, 15000),
    corpDisc: rnd(0, 20000),
    obsDetails: rnd(0, 1) ? "Price mismatch observed" : "",
    files: rnd(0, 2) > 0 ? { proof: true } : {},
    month: MONTHS[mon], monthIdx: mon, year: yr,
  };
});

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n, compact = false) => {
  const a = Math.abs(Math.round(n || 0));
  if (compact) {
    if (a >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
    if (a >= 100000) return (n / 100000).toFixed(1) + "L";
    if (a >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString("en-IN");
  }
  return n?.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0";
};

// ─── THEME ──────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0A0E1A", card: "#111827", cardBorder: "#1e293b",
  sidebar: "#0D1321", header: "#0D1321",
  text: "#e2e8f0", muted: "#64748b", accent: "#3b82f6",
  accentGlow: "rgba(59,130,246,0.15)",
  success: "#10b981", danger: "#ef4444", warning: "#f59e0b",
  chart1: "#3b82f6", chart2: "#10b981", chart3: "#f59e0b", chart4: "#8b5cf6", chart5: "#ef4444", chart6: "#06b6d4",
};
const LIGHT = {
  bg: "#f0f4ff", card: "#ffffff", cardBorder: "#e2e8f0",
  sidebar: "#1e293b", header: "#ffffff",
  text: "#1e293b", muted: "#64748b", accent: "#2563eb",
  accentGlow: "rgba(37,99,235,0.08)",
  success: "#059669", danger: "#dc2626", warning: "#d97706",
  chart1: "#2563eb", chart2: "#059669", chart3: "#d97706", chart4: "#7c3aed", chart5: "#dc2626", chart6: "#0891b2",
};

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────
const CTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
      <p style={{ color: t.muted, fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || t.text, fontSize: 13, fontWeight: 500 }}>
          {p.name}: <span style={{ color: t.text }}>₹{fmt(p.value, true)}</span>
        </p>
      ))}
    </div>
  );
};

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, color, t, trend }) => (
  <div style={{
    background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12,
    padding: "16px 20px", position: "relative", overflow: "hidden",
    transition: "transform 0.2s,box-shadow 0.2s", cursor: "default",
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${t.accentGlow}`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${color}14` }} />
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      {trend !== undefined && <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 20,
        background: trend >= 0 ? `${t.success}20` : `${t.danger}20`,
        color: trend >= 0 ? t.success : t.danger, fontWeight: 600
      }}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
      </span>}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{value}</div>
    <div style={{ fontSize: 12, color: t.muted, marginTop: 4, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SectionHeader = ({ title, t, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 18, background: t.accent, borderRadius: 2 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{title}</span>
    </div>
    <div style={{ display: "flex", gap: 8 }}>{children}</div>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const Badge = ({ v, t }) => {
  const lv = String(v || "").toLowerCase();
  const isBreach = lv.includes("breach") && !lv.includes("not");
  const isHold = lv.includes("hold");
  const bg = isHold ? `${t.warning}20` : isBreach ? `${t.danger}20` : `${t.success}20`;
  const col = isHold ? t.warning : isBreach ? t.danger : t.success;
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: bg, color: col, fontWeight: 600, whiteSpace: "nowrap" }}>
      {isHold ? "⏸ Hold" : isBreach ? "⚠ Breach" : "✓ No Breach"}
    </span>
  );
};

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function DealTrackMIS() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  const [DB, setDB] = useState(RAW);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ location: "", dealer: "", model: "", variant: "", consultant: "", decision: "", docs: "", dateFrom: "", dateTo: "" });
  const [sort, setSort] = useState({ col: "dealId", dir: "asc" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [colVis, setColVis] = useState({ dealId: true, cname: true, dname: true, dlocation: true, model: true, variant: true, scname: true, totalSb: true, totalAc: true, totalVr: true, decision: true, docs: true, dov: true });
  const [showColPicker, setShowColPicker] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [chartTab, setChartTab] = useState("monthly");
  const searchRef = useRef();

  const notify = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── FILTERED DATA ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...DB];
    const q = search.toLowerCase();
    if (q) data = data.filter(d => [d.dealId, d.cname, d.dname, d.model, d.variant, d.scname, d.dlocation].some(v => String(v || "").toLowerCase().includes(q)));
    if (filters.location) data = data.filter(d => d.dlocation === filters.location);
    if (filters.dealer) data = data.filter(d => d.dname === filters.dealer);
    if (filters.model) data = data.filter(d => d.model === filters.model);
    if (filters.variant) data = data.filter(d => d.variant === filters.variant);
    if (filters.consultant) data = data.filter(d => d.scname === filters.consultant);
    if (filters.decision) data = data.filter(d => {
      const ld = String(d.decision || "").toLowerCase();
      if (filters.decision === "Breach") return ld.includes("breach") && !ld.includes("not");
      if (filters.decision === "Not Breach") return ld.includes("not");
      return ld.includes("hold");
    });
    if (filters.docs === "yes") data = data.filter(d => d.files && Object.keys(d.files).length > 0);
    if (filters.docs === "no") data = data.filter(d => !d.files || Object.keys(d.files).length === 0);
    if (filters.dateFrom) data = data.filter(d => d.dov >= filters.dateFrom);
    if (filters.dateTo) data = data.filter(d => d.dov <= filters.dateTo);
    data.sort((a, b) => {
      let va = a[sort.col], vb = b[sort.col];
      if (typeof va === "number") return sort.dir === "asc" ? va - vb : vb - va;
      return sort.dir === "asc" ? String(va || "").localeCompare(String(vb || "")) : String(vb || "").localeCompare(String(va || ""));
    });
    return data;
  }, [DB, search, filters, sort]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const n = filtered.length, vT = filtered.reduce((s, d) => s + (d.totalVr || 0), 0);
    const bT = filtered.reduce((s, d) => s + (d.totalAc || 0), 0);
    const sBT = filtered.reduce((s, d) => s + (d.totalSb || 0), 0);
    const breach = filtered.filter(d => String(d.decision || "").toLowerCase().includes("breach") && !String(d.decision || "").toLowerCase().includes("not")).length;
    const docs = filtered.filter(d => d.files && Object.keys(d.files).length > 0).length;
    const scMap = {};
    filtered.forEach(d => { scMap[d.scname] = (scMap[d.scname] || 0) + 1; });
    const topSC = Object.entries(scMap).sort((a, b) => b[1] - a[1])[0];
    const locMap = {};
    filtered.forEach(d => { locMap[d.dlocation] = (locMap[d.dlocation] || 0) + 1; });
    const topLoc = Object.entries(locMap).sort((a, b) => b[1] - a[1])[0];
    return { n, vT, bT, sBT, breach, noBreach: n - breach, docsP: n ? Math.round(docs / n * 100) : 0, topSC: topSC ? topSC[0] : "-", topLoc: topLoc ? topLoc[0] : "-" };
  }, [filtered]);

  // ── CHART DATA ────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => MONTHS.map((m, i) => {
    const rows = filtered.filter(d => d.monthIdx === i);
    return { month: m, deals: rows.length, actual: rows.reduce((s, d) => s + (d.totalAc || 0), 0), variance: Math.abs(rows.reduce((s, d) => s + (d.totalVr || 0), 0)) };
  }), [filtered]);

  const locationData = useMemo(() => {
    const map = {};
    filtered.forEach(d => { map[d.dlocation] = (map[d.dlocation] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const decisionData = useMemo(() => {
    const b = filtered.filter(d => String(d.decision || "").toLowerCase().includes("breach") && !String(d.decision || "").toLowerCase().includes("not")).length;
    const nb = filtered.filter(d => String(d.decision || "").toLowerCase().includes("not")).length;
    const h = filtered.filter(d => String(d.decision || "").toLowerCase().includes("hold")).length;
    return [{ name: "Breach", value: b }, { name: "No Breach", value: nb }, { name: "Hold", value: h }];
  }, [filtered]);

  const consultantData = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.scname]) map[d.scname] = { name: d.scname, deals: 0, revenue: 0, variance: 0 };
      map[d.scname].deals++;
      map[d.scname].revenue += (d.totalAc || 0);
      map[d.scname].variance += Math.abs(d.totalVr || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [filtered]);

  const dealerData = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.dname]) map[d.dname] = { name: d.dname.split(" ")[0], actual: 0, variance: 0, deals: 0 };
      map[d.dname].actual += (d.totalAc || 0);
      map[d.dname].variance += Math.abs(d.totalVr || 0);
      map[d.dname].deals++;
    });
    return Object.values(map).sort((a, b) => b.actual - a.actual).slice(0, 8);
  }, [filtered]);

  const modelData = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.model]) map[d.model] = { name: d.model, deals: 0, revenue: 0 };
      map[d.model].deals++;
      map[d.model].revenue += (d.totalAc || 0);
    });
    return Object.values(map).sort((a, b) => b.deals - a.deals);
  }, [filtered]);

  // ── SORT HANDLER ─────────────────────────────────────────────────────────
  const handleSort = col => {
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
    setPage(1);
  };

  // ── SELECT ALL ───────────────────────────────────────────────────────────
  const allSel = paginated.length > 0 && paginated.every(d => selected.has(d.id));
  const toggleAll = () => {
    const ns = new Set(selected);
    if (allSel) paginated.forEach(d => ns.delete(d.id));
    else paginated.forEach(d => ns.add(d.id));
    setSelected(ns);
  };

  // ── DELETE ───────────────────────────────────────────────────────────────
  const deleteSelected = () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} records?`)) return;
    setDB(db => db.filter(d => !selected.has(d.id)));
    setSelected(new Set());
    notify(`${selected.size} records deleted`, "danger");
  };

  // ── EXPORT CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const cols = ["dealId", "cname", "cnum", "dname", "dlocation", "model", "variant", "scname", "totalSb", "totalAc", "totalVr", "decision", "dov"];
    const header = cols.join(",");
    const rows = filtered.map(d => cols.map(c => `"${d[c] || ""}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "DealTrack_Export.csv";
    a.click();
    notify("CSV exported successfully", "success");
  };

  // ── AI INSIGHT ───────────────────────────────────────────────────────────
  const genInsight = () => {
    setAiInsight(null);
    setLoading(true);
    setTimeout(() => {
      const b = kpis.breach, pct = kpis.n ? Math.round(b / kpis.n * 100) : 0;
      const highVarDeals = filtered.filter(d => Math.abs(d.totalVr || 0) > 100000).length;
      const insights = [
        `📊 ${pct}% breach rate detected across ${kpis.n} deals — ${pct > 30 ? "above" : "within"} industry average of 25%.`,
        `💰 Total variance exposure is ₹${fmt(Math.abs(kpis.vT), true)} — primarily driven by ${kpis.topSC}'s portfolio.`,
        `⚠️ ${highVarDeals} deals exceed ₹1L variance threshold — immediate review recommended.`,
        `📍 ${kpis.topLoc} is the highest performing location with consistent deal velocity.`,
        `📁 ${kpis.docsP}% documentation compliance — ${kpis.docsP < 70 ? "below 70% target, risk flagged" : "meeting compliance threshold"}.`,
        `🚀 ${kpis.topSC} leads consultant performance — recommend replicating best practices across team.`,
      ];
      setAiInsight(insights);
      setLoading(false);
    }, 1200);
  };

  // ── DUPLICATE DETECTION ──────────────────────────────────────────────────
  const duplicates = useMemo(() => {
    const seen = {};
    const dups = [];
    DB.forEach(d => {
      const key = `${d.cnum}_${d.model}_${d.dov}`;
      if (seen[key]) dups.push(d.dealId);
      else seen[key] = true;
    });
    return dups;
  }, [DB]);

  // ── RISK ALERTS ──────────────────────────────────────────────────────────
  const risks = useMemo(() => {
    const alerts = [];
    const highVar = filtered.filter(d => Math.abs(d.totalVr || 0) > 150000);
    if (highVar.length > 0) alerts.push({ type: "danger", msg: `${highVar.length} deals with variance >₹1.5L require review` });
    if (kpis.docsP < 70) alerts.push({ type: "warning", msg: `Documentation compliance at ${kpis.docsP}% — below 70% threshold` });
    if (duplicates.length > 0) alerts.push({ type: "warning", msg: `${duplicates.length} potential duplicate records detected` });
    const breachPct = kpis.n ? kpis.breach / kpis.n : 0;
    if (breachPct > 0.35) alerts.push({ type: "danger", msg: `Breach rate ${Math.round(breachPct * 100)}% exceeds 35% threshold` });
    return alerts;
  }, [filtered, kpis, duplicates]);

  const PIE_COLORS = [t.chart5, t.chart2, t.chart3];

  const colDefs = [
    { key: "dealId", label: "Deal ID" }, { key: "cname", label: "Customer" }, { key: "dname", label: "Dealership" },
    { key: "dlocation", label: "Location" }, { key: "model", label: "Model" }, { key: "variant", label: "Variant" },
    { key: "scname", label: "Consultant" }, { key: "totalSb", label: "Standard ₹" }, { key: "totalAc", label: "Actual ₹" },
    { key: "totalVr", label: "Variance ₹" }, { key: "decision", label: "Decision" }, { key: "docs", label: "Docs" }, { key: "dov", label: "Visit Date" },
  ];

  // ── STYLES ────────────────────────────────────────────────────────────────
  const S = {
    app: { display: "flex", flexDirection: "column", minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans',sans-serif", color: t.text, fontSize: 13 },
    main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
    header: { background: t.header, borderBottom: `1px solid ${t.cardBorder}`, padding: "0 24px", display: "flex", alignItems: "center", gap: 24, position: "sticky", top: 0, zIndex: 100, height: 64, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
    navContainer: { display: "flex", alignItems: "center", height: "100%", flex: 1, gap: 4 },
    content: { padding: "20px 24px", flex: 1 },
    card: { background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
    input: { background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "7px 11px", color: t.text, fontSize: 12, outline: "none", width: "100%" },
    select: { background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "7px 10px", color: t.text, fontSize: 12, outline: "none" },
    btn: { padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" },
    th: { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: t.muted, textTransform: "uppercase", letterSpacing: 0.5, background: t.bg, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" },
    td: { padding: "10px 12px", fontSize: 12, color: t.text, borderBottom: `1px solid ${t.cardBorder}`, whiteSpace: "nowrap" },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: "100%", cursor: "pointer",
      color: active ? t.accent : t.muted, fontWeight: active ? 600 : 400,
      transition: "all 0.15s", fontSize: 13,
      borderBottom: active ? `3px solid ${t.accent}` : "3px solid transparent",
      background: active ? `${t.accent}08` : "transparent",
    }),
    chartTab: (active) => ({
      padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
      background: active ? t.accent : "transparent", color: active ? "#fff" : t.muted, transition: "all 0.2s"
    }),
  };

  const navItems = [
    { id: "dashboard", icon: "⬛", label: "Dashboard" },
    { id: "records", icon: "📋", label: "All Records" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "insights", icon: "🤖", label: "AI Insights" },
    { id: "alerts", icon: "🔔", label: "Risk Alerts", badge: risks.length },
  ];

  return (
    <div style={S.app}>
      {/* HEADER */}
      <div style={S.header}>
        {/* LOGO */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${t.accent},${t.chart4})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📊</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#fff" : t.text }}>DealTrack</div>
            <div style={{ fontSize: 10, color: t.muted }}>MIS Dashboard</div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div style={S.navContainer}>
          {navItems.map(n => (
            <div key={n.id} style={S.navItem(activeNav === n.id)} onClick={() => setActiveNav(n.id)}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 && <span style={{ background: t.danger, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, marginLeft: 4 }}>{n.badge}</span>}
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right", borderRight: `1px solid ${t.cardBorder}`, paddingRight: 16 }}>
            <div style={{ fontSize: 10, color: t.muted }}>Total Records</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.accent, fontFamily: "monospace" }}>{DB.length}</div>
          </div>

          {activeNav === "records" && (
            <div style={{ position: "relative" }}>
              <input ref={searchRef} style={{ ...S.input, width: 180, paddingLeft: 28 }} placeholder="🔍 Search deals…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          )}

          <button style={{ ...S.btn, background: `${t.accent}20`, color: t.accent, minWidth: 40, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDark(d => !d)}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {/* NOTIFICATION */}
        {notification && (
          <div style={{
            position: "fixed", top: 16, right: 24, zIndex: 100, padding: "10px 18px", borderRadius: 10,
            background: notification.type === "danger" ? t.danger : notification.type === "success" ? t.success : t.accent,
            color: "#fff", fontWeight: 600, fontSize: 13, boxShadow: "0 4px 24px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 8
          }}>
            {notification.type === "danger" ? "🗑" : notification.type === "success" ? "✅" : "ℹ️"} {notification.msg}
          </div>
        )}

        <div style={S.content}>

          {/* ── DASHBOARD TAB ── */}
          {activeNav === "dashboard" && (
            <>
              {/* KPI GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                <KpiCard t={t} label="Total Deals" value={kpis.n} icon="🤝" color={t.accent} trend={8} />
                <KpiCard t={t} label="Standard Amount" value={`₹${fmt(kpis.sBT, true)}`} icon="📋" color={t.chart2} trend={5} />
                <KpiCard t={t} label="Actual Business" value={`₹${fmt(kpis.bT, true)}`} icon="💰" color={t.success} trend={3} />
                <KpiCard t={t} label="Total Variance" value={`₹${fmt(Math.abs(kpis.vT), true)}`} icon="📉" color={t.danger} trend={-12} />
                <KpiCard t={t} label="Breach Deals" value={kpis.breach} icon="⚠️" color={t.danger} sub={`${kpis.n ? Math.round(kpis.breach / kpis.n * 100) : 0}% of total`} />
                <KpiCard t={t} label="No Breach" value={kpis.noBreach} icon="✅" color={t.success} />
                <KpiCard t={t} label="Docs Uploaded" value={`${kpis.docsP}%`} icon="📁" color={t.chart3} trend={kpis.docsP - 70} />
                <KpiCard t={t} label="Top Consultant" value={kpis.topSC.split(" ")[0]} icon="👤" color={t.chart4} />
                <KpiCard t={t} label="Top Location" value={kpis.topLoc} icon="📍" color={t.chart6} />
              </div>

              {/* RISK ALERTS STRIP */}
              {risks.length > 0 && (
                <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {risks.map((r, i) => (
                    <div key={i} style={{ background: r.type === "danger" ? `${t.danger}15` : `${t.warning}15`, border: `1px solid ${r.type === "danger" ? t.danger : t.warning}40`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{r.type === "danger" ? "🚨" : "⚠️"}</span>
                      <span style={{ color: r.type === "danger" ? t.danger : t.warning, fontWeight: 600, fontSize: 12 }}>{r.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CHARTS ROW 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={S.card}>
                  <SectionHeader title="Monthly Deal Trend" t={t}>
                    {["monthly", "revenue", "variance"].map(tab => (
                      <button key={tab} style={S.chartTab(chartTab === tab)} onClick={() => setChartTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </SectionHeader>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={t.accent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={t.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                      <XAxis dataKey="month" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => chartTab === "monthly" ? v : `₹${fmt(v, true)}`} />
                      <Tooltip content={<CTooltip t={t} />} />
                      {chartTab === "monthly" && <Area type="monotone" dataKey="deals" stroke={t.accent} fill="url(#grad1)" strokeWidth={2} name="Deals" />}
                      {chartTab === "revenue" && <Area type="monotone" dataKey="actual" stroke={t.success} fill={`${t.success}20`} strokeWidth={2} name="Revenue" />}
                      {chartTab === "variance" && <Area type="monotone" dataKey="variance" stroke={t.danger} fill={`${t.danger}20`} strokeWidth={2} name="Variance" />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.card}>
                  <SectionHeader title="Breach Analysis" t={t} />
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={decisionData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {decisionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
                    {decisionData.map((d, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: PIE_COLORS[i] }}>{d.value}</div>
                        <div style={{ fontSize: 10, color: t.muted }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHARTS ROW 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={S.card}>
                  <SectionHeader title="Consultant Performance" t={t} />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={consultantData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} horizontal={false} />
                      <XAxis type="number" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${fmt(v, true)}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={70} tickFormatter={v => v.split(" ")[0]} />
                      <Tooltip content={<CTooltip t={t} />} />
                      <Bar dataKey="revenue" fill={t.chart4} radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.card}>
                  <SectionHeader title="Location Distribution" t={t} />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={locationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Deals">
                        {locationData.map((_, i) => <Cell key={i} fill={[t.chart1, t.chart2, t.chart3, t.chart4, t.chart5, t.chart6][i % 6]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* DEALER + MODEL */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                <div style={S.card}>
                  <SectionHeader title="Top 8 Dealership Performance" t={t} />
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dealerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${fmt(v, true)}`} />
                      <Tooltip content={<CTooltip t={t} />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
                      <Bar dataKey="actual" fill={t.chart1} radius={[3, 3, 0, 0]} name="Actual" />
                      <Bar dataKey="variance" fill={t.danger} radius={[3, 3, 0, 0]} name="Variance" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.card}>
                  <SectionHeader title="Model-wise Deals" t={t} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                    {modelData.map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 70, fontSize: 11, color: t.muted, textAlign: "right" }}>{m.name}</div>
                        <div style={{ flex: 1, height: 20, background: `${t.cardBorder}`, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.round(m.deals / filtered.length * 100)}%`, background: [t.chart1, t.chart2, t.chart3, t.chart4, t.chart5, t.chart6][i % 6], borderRadius: 4, transition: "width 0.5s", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{m.deals}</span>
                          </div>
                        </div>
                        <div style={{ width: 50, fontSize: 11, color: t.muted }}>{Math.round(m.deals / filtered.length * 100)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── RECORDS TAB ── */}
          {activeNav === "records" && (
            <>
              {/* FILTER BAR */}
              <div style={{ ...S.card, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  {[
                    { key: "location", opts: LOCATIONS }, { key: "dealer", opts: DEALERS }, { key: "model", opts: MODELS },
                    { key: "variant", opts: VARIANTS }, { key: "consultant", opts: CONSULTANTS },
                    { key: "decision", opts: ["Breach", "Not Breach", "Hold"] }, { key: "docs", opts: ["yes", "no"] },
                  ].map(({ key, opts }) => (
                    <select key={key} style={{ ...S.select, minWidth: 120 }} value={filters[key]}
                      onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1); }}>
                      <option value="">{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                  <input type="date" style={{ ...S.input, width: 130 }} value={filters.dateFrom}
                    onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }} placeholder="From" />
                  <input type="date" style={{ ...S.input, width: 130 }} value={filters.dateTo}
                    onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }} placeholder="To" />
                  <button style={{ ...S.btn, background: `${t.danger}20`, color: t.danger }}
                    onClick={() => { setFilters({ location: "", dealer: "", model: "", variant: "", consultant: "", decision: "", docs: "", dateFrom: "", dateTo: "" }); setSearch(""); setPage(1); }}>
                    ✕ Clear
                  </button>
                </div>
              </div>

              {/* ACTION BAR */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <button style={{ ...S.btn, background: `${t.success}20`, color: t.success }} onClick={exportCSV}>📥 Export CSV</button>
                {selected.size > 0 && (
                  <button style={{ ...S.btn, background: `${t.danger}20`, color: t.danger }} onClick={deleteSelected}>
                    🗑 Delete ({selected.size})
                  </button>
                )}
                <div style={{ position: "relative" }}>
                  <button style={{ ...S.btn, background: `${t.accent}20`, color: t.accent }} onClick={() => setShowColPicker(v => !v)}>
                    ⚙️ Columns
                  </button>
                  {showColPicker && (
                    <div style={{ position: "absolute", top: 36, left: 0, zIndex: 50, background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                      {colDefs.map(c => (
                        <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.text, cursor: "pointer" }}>
                          <input type="checkbox" checked={colVis[c.key]} onChange={e => setColVis(v => ({ ...v, [c.key]: e.target.checked }))} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: t.muted }}>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
              </div>

              {/* TABLE */}
              <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, width: 40 }}>
                          <input type="checkbox" checked={allSel} onChange={toggleAll} />
                        </th>
                        {colDefs.filter(c => colVis[c.key]).map(c => (
                          <th key={c.key} style={S.th} onClick={() => handleSort(c.key)}>
                            {c.label} {sort.col === c.key ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                          </th>
                        ))}
                        <th style={S.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((d, ri) => {
                        const isSel = selected.has(d.id);
                        return (
                          <tr key={d.id} style={{ background: isSel ? `${t.accent}10` : ri % 2 === 0 ? t.bg : t.card, transition: "background 0.15s", cursor: "pointer" }}
                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = `${t.accent}08`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSel ? `${t.accent}10` : ri % 2 === 0 ? t.bg : t.card; }}>
                            <td style={S.td}>
                              <input type="checkbox" checked={isSel} onChange={() => {
                                const ns = new Set(selected);
                                isSel ? ns.delete(d.id) : ns.add(d.id);
                                setSelected(ns);
                              }} />
                            </td>
                            {colVis.dealId && <td style={S.td}><span style={{ background: `${t.accent}20`, color: t.accent, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{d.dealId}</span></td>}
                            {colVis.cname && <td style={{ ...S.td, fontWeight: 500 }}>{d.cname}</td>}
                            {colVis.dname && <td style={S.td}>{d.dname}</td>}
                            {colVis.dlocation && <td style={S.td}><span style={{ display: "flex", alignItems: "center", gap: 4 }}>📍{d.dlocation}</span></td>}
                            {colVis.model && <td style={{ ...S.td, fontWeight: 500 }}>{d.model}</td>}
                            {colVis.variant && <td style={{ ...S.td, color: t.muted }}>{d.variant}</td>}
                            {colVis.scname && <td style={S.td}>{d.scname.split(" ")[0]}</td>}
                            {colVis.totalSb && <td style={{ ...S.td, fontFamily: "monospace", textAlign: "right" }}>₹{fmt(d.totalSb, true)}</td>}
                            {colVis.totalAc && <td style={{ ...S.td, fontFamily: "monospace", textAlign: "right" }}>₹{fmt(d.totalAc, true)}</td>}
                            {colVis.totalVr && <td style={{ ...S.td, fontFamily: "monospace", textAlign: "right", color: d.totalVr < 0 ? t.danger : t.success, fontWeight: 600 }}>
                              {d.totalVr < 0 ? "-" : "+"}₹{fmt(Math.abs(d.totalVr), true)}
                            </td>}
                            {colVis.decision && <td style={S.td}><Badge v={d.decision} t={t} /></td>}
                            {colVis.docs && <td style={{ ...S.td, textAlign: "center" }}>
                              {Object.keys(d.files || {}).length > 0
                                ? <span style={{ color: t.success, fontWeight: 600 }}>✅</span>
                                : <span style={{ color: t.muted }}>—</span>}
                            </td>}
                            {colVis.dov && <td style={{ ...S.td, color: t.muted }}>{d.dov}</td>}
                            <td style={S.td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button style={{ ...S.btn, padding: "4px 10px", background: `${t.accent}20`, color: t.accent, fontSize: 11 }} onClick={() => setModal(d)}>👁 View</button>
                                <button style={{ ...S.btn, padding: "4px 8px", background: `${t.danger}20`, color: t.danger, fontSize: 11 }}
                                  onClick={() => { if (window.confirm("Delete?")) setDB(db => db.filter(x => x.id !== d.id)); notify("Record deleted", "danger"); }}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paginated.length === 0 && (
                        <tr><td colSpan={20} style={{ ...S.td, textAlign: "center", padding: "40px", color: t.muted }}>No records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* PAGINATION */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderTop: `1px solid ${t.cardBorder}` }}>
                  <button style={{ ...S.btn, padding: "5px 12px", background: t.card, color: t.muted }} disabled={page === 1} onClick={() => setPage(1)}>«</button>
                  <button style={{ ...S.btn, padding: "5px 12px", background: t.card, color: t.muted }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = page <= 3 ? i + 1 : page + i - 2;
                    if (p < 1 || p > totalPages) return null;
                    return (
                      <button key={p} style={{ ...S.btn, padding: "5px 12px", background: p === page ? t.accent : "transparent", color: p === page ? "#fff" : t.muted, minWidth: 32 }} onClick={() => setPage(p)}>{p}</button>
                    );
                  })}
                  <button style={{ ...S.btn, padding: "5px 12px", background: t.card, color: t.muted }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  <button style={{ ...S.btn, padding: "5px 12px", background: t.card, color: t.muted }} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
                </div>
              </div>
            </>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeNav === "analytics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={S.card}>
                  <SectionHeader title="Monthly Revenue vs Variance" t={t} />
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                      <XAxis dataKey="month" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${fmt(v, true)}`} />
                      <Tooltip content={<CTooltip t={t} />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
                      <Line type="monotone" dataKey="actual" stroke={t.chart2} strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                      <Line type="monotone" dataKey="variance" stroke={t.danger} strokeWidth={2} dot={{ r: 3 }} name="Variance" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.card}>
                  <SectionHeader title="Discount Breakup Analysis" t={t} />
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={consultantData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                      <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
                      <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${fmt(v, true)}`} />
                      <Tooltip content={<CTooltip t={t} />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
                      <Bar dataKey="revenue" fill={t.chart1} radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="variance" fill={t.chart3} radius={[4, 4, 0, 0]} name="Variance" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={S.card}>
                <SectionHeader title="Dealership Revenue Comparison" t={t} />
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dealerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                    <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${fmt(v, true)}`} />
                    <Tooltip content={<CTooltip t={t} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: t.muted }} />
                    <Bar dataKey="actual" fill={t.chart1} radius={[4, 4, 0, 0]} name="Actual Business" />
                    <Bar dataKey="variance" fill={t.danger} radius={[4, 4, 0, 0]} name="Total Variance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ── AI INSIGHTS TAB ── */}
          {activeNav === "insights" && (
            <div style={{ maxWidth: 700 }}>
              <div style={S.card}>
                <SectionHeader title="AI-Powered Deal Intelligence" t={t} />
                <p style={{ color: t.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                  Generate smart insights from your deal data using AI analysis. Click below to analyze patterns, detect anomalies, and surface actionable recommendations.
                </p>
                <button style={{ ...S.btn, background: `linear-gradient(135deg,${t.accent},${t.chart4})`, color: "#fff", padding: "10px 24px", fontSize: 13 }} onClick={genInsight}>
                  {loading ? "⏳ Analyzing..." : "🤖 Generate Insights"}
                </button>
              </div>
              {loading && (
                <div style={S.card}>
                  {[80, 60, 90, 70, 50].map((w, i) => (
                    <div key={i} style={{ height: 14, background: `${t.accent}20`, borderRadius: 7, marginBottom: 12, width: `${w}%`, animation: "pulse 1.5s infinite" }} />
                  ))}
                </div>
              )}
              {aiInsight && !loading && (
                <div style={S.card}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {aiInsight.map((ins, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 12, padding: "12px 14px", background: t.bg, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
                        animation: `slideIn 0.3s ease ${i * 0.1}s both`
                      }}>
                        <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ins.split(" ")[0]}</div>
                        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6 }}>{ins.slice(ins.indexOf(" ") + 1)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* DUPLICATE DETECTION */}
              <div style={S.card}>
                <SectionHeader title="Duplicate Record Detection" t={t} />
                {duplicates.length === 0
                  ? <div style={{ color: t.success, fontWeight: 600, fontSize: 13 }}>✅ No duplicates detected across {DB.length} records</div>
                  : <div style={{ color: t.warning, fontSize: 13 }}>⚠️ {duplicates.length} potential duplicates: {duplicates.slice(0, 5).join(", ")}{duplicates.length > 5 ? ` +${duplicates.length - 5} more` : ""}</div>
                }
              </div>
            </div>
          )}

          {/* ── ALERTS TAB ── */}
          {activeNav === "alerts" && (
            <div style={{ maxWidth: 700 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {risks.length === 0
                  ? <div style={{ ...S.card, textAlign: "center", color: t.success, fontWeight: 600 }}>✅ No active risk alerts</div>
                  : risks.map((r, i) => (
                    <div key={i} style={{ ...S.card, borderLeft: `3px solid ${r.type === "danger" ? t.danger : t.warning}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{r.type === "danger" ? "🚨" : "⚠️"}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: r.type === "danger" ? t.danger : t.warning, fontSize: 13, marginBottom: 4 }}>
                            {r.type === "danger" ? "Critical Alert" : "Warning"}
                          </div>
                          <div style={{ color: t.text, fontSize: 13 }}>{r.msg}</div>
                          <div style={{ color: t.muted, fontSize: 11, marginTop: 6 }}>Detected at {new Date().toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {/* VARIANCE LEADERBOARD */}
                <div style={S.card}>
                  <SectionHeader title="High Variance Deals — Immediate Review" t={t} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...DB].sort((a, b) => Math.abs(b.totalVr || 0) - Math.abs(a.totalVr || 0)).slice(0, 8).map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: t.bg, borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: t.muted, fontFamily: "monospace", width: 20 }}>{i + 1}.</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{d.dealId} — {d.cname}</div>
                            <div style={{ fontSize: 11, color: t.muted }}>{d.dname} · {d.model}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: t.danger, fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>₹{fmt(Math.abs(d.totalVr || 0), true)}</span>
                          <Badge v={d.decision} t={t} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DETAIL MODAL */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setModal(null)}>
          <div style={{ background: t.card, borderRadius: 16, padding: 24, maxWidth: 580, width: "100%", maxHeight: "85vh", overflow: "auto", border: `1px solid ${t.cardBorder}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <span style={{ background: `${t.accent}20`, color: t.accent, padding: "3px 10px", borderRadius: 8, fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{modal.dealId}</span>
                <span style={{ marginLeft: 10 }}><Badge v={modal.decision} t={t} /></span>
              </div>
              <button style={{ ...S.btn, background: t.bg, color: t.muted, padding: "4px 10px" }} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Customer", modal.cname], ["Contact", modal.cnum], ["Dealership", modal.dname], ["Location", modal.dlocation],
                ["Model", modal.model], ["Variant", modal.variant], ["Consultant", modal.scname], ["Project", modal.projectName],
                ["Nature", modal.nature], ["Visit Date", modal.dov], ["Booking Date", modal.dob], ["Booking Amt", `₹${fmt(modal.bookingAmt)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "10px 12px", background: t.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: t.muted, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{v || "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
              {[["Standard", modal.totalSb, t.text], ["Actual", modal.totalAc, t.success], ["Variance", modal.totalVr, modal.totalVr < 0 ? t.danger : t.success]].map(([k, v, c]) => (
                <div key={k} style={{ padding: "12px 14px", background: t.bg, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.muted, marginBottom: 4, textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c, fontFamily: "monospace" }}>₹{fmt(v, true)}</div>
                </div>
              ))}
            </div>
            {/* Deal Breakup */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Component Breakup</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Ex Showroom", modal.exSb], ["Registration", modal.regSb], ["Accessories", modal.accSb], ["Insurance", modal.insSb],
                ["Cash Disc", modal.cashDisc], ["Accessories Disc", modal.accDisc], ["Corp Disc", modal.corpDisc]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: t.bg, borderRadius: 6 }}>
                    <span style={{ fontSize: 11, color: t.muted }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: t.text }}>₹{fmt(v, true)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,button{font-family:inherit;}
        input[type=checkbox]{accent-color:${t.accent};}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${t.cardBorder};border-radius:3px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
      `}</style>
    </div>
  );
}
