/**
 * Generic DOM utility functions and formatting helpers.
 */

export const g = (id) => document.getElementById(id);
export const gv = (id) => g(id)?.value?.trim() || "";

export function fmt(n) {
  if (!n && n !== 0) return "-";
  return Math.round(n).toLocaleString("en-IN");
}

export const fN = fmt;

export function num(el) {
  return parseFloat(el?.value) || 0;
}

export function setVal(id, val) {
  const el = g(id);
  if (el) el.value = !val && val !== 0 ? "" : fmt(val);
}

export const vrColor = (v) => (v > 0 ? "#e05c5c" : v < 0 ? "#5cb87a" : "");

export function decBadge(d) {
  if (!d) return "—";
  const cls = d === "Breach" ? "badge-breach" : d === "Not Breach" ? "badge-nbr" : "badge-hold";
  return `<span class="badge ${cls}">${d}</span>`;
}
