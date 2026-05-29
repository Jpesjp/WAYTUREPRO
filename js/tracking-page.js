import { db } from "./firebase-config.js";
import {
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const TRIP_STATUSES = ["Por planear", "En organización", "Reservado", "En curso", "Reprogramado", "Finalizado"];

const trackingForm       = document.getElementById("trackingForm");
const trackingCode       = document.getElementById("trackingCode");
const trackingMessage    = document.getElementById("trackingMessage");
const trackingResult     = document.getElementById("trackingResult");
const resultDestination  = document.getElementById("resultDestination");
const resultCode         = document.getElementById("resultCode");
const resultCodeRepeat   = document.getElementById("resultCodeRepeat");
const resultStatus       = document.getElementById("resultStatus");
const resultLocation     = document.getElementById("resultLocation");
const resultFinished     = document.getElementById("resultFinished");
const resultStart        = document.getElementById("resultStart");
const resultEnd          = document.getElementById("resultEnd");
const resultMapCaption   = document.getElementById("resultMapCaption");
const trackingMap        = document.getElementById("trackingMap");
const progressTrack      = document.getElementById("progressTrack");
const publicItinerary    = document.getElementById("publicItinerary");
const publicStatusHistory= document.getElementById("publicStatusHistory");
const mainNav            = document.getElementById("mainNav");
const menuToggle         = document.getElementById("menuToggle");

// ── Utilidades ────────────────────────────────────────────────────────────────
function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
function clean(text) { return String(text || "").trim(); }
function normalizeForSearch(text) {
  return clean(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function normalizeStatus(status) {
  const r = normalizeForSearch(status);
  if (r.includes("organ"))  return "En organización";
  if (r.includes("reserv")) return "Reservado";
  if (r.includes("curso"))  return "En curso";
  if (r.includes("final"))  return "Finalizado";
  if (r.includes("reprogram") || r.includes("incid") || r.includes("cambio")) return "Reprogramado";
  return "Por planear";
}
function statusClass(s) {
  const n = normalizeStatus(s);
  if (n === "En organización") return "organizacion";
  if (n === "Reservado")       return "reservado";
  if (n === "En curso")        return "curso";
  if (n === "Reprogramado")    return "reprogramado";
  if (n === "Finalizado")      return "finalizado";
  return "planear";
}
function mapUrl(q) { return "https://www.google.com/maps?q=" + encodeURIComponent(q || "Europa turismo") + "&output=embed"; }
function mapsLink(q) { return "https://maps.google.com/?q=" + encodeURIComponent(q || ""); }

function fmtDate(d) {
  if (!d) return "Sin fecha";
  const dt = new Date(d + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(value) {
  if (!value) return "Sin fecha";
  const dt = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(dt.getTime()) ? "Sin fecha" : dt.toLocaleString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// FIX: calcula y muestra la duración del viaje en días/noches
function tripDuration(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const n = Math.round((new Date(endDate) - new Date(startDate)) / 86400000);
  return n > 0 ? (n === 1 ? "1 noche" : `${n} noches`) : "";
}

// ── Progreso ──────────────────────────────────────────────────────────────────
function renderProgress(status) {
  const normalized = normalizeStatus(status);
  const i = Math.max(0, TRIP_STATUSES.indexOf(normalized));
  progressTrack.innerHTML = TRIP_STATUSES.map((step, index) =>
    `<div class="step-item ${index <= i ? "done" : ""}">${esc(step)}</div>`
  ).join("");
}

// ── Itinerario público ────────────────────────────────────────────────────────
function renderItinerary(t) {
  const items = [...(t.itinerary || [])].sort((a, b) =>
    String((a.date || "") + (a.time || "")).localeCompare(String((b.date || "") + (b.time || "")))
  );
  if (!items.length) {
    publicItinerary.innerHTML = '<div class="empty-state">Este viaje aún no tiene actividades públicas registradas.</div>';
    return;
  }
  publicItinerary.innerHTML = items.map(a => `
    <article class="history-card">
      <strong>${esc(a.time || "--:--")} – ${esc(a.place)}</strong>
      <p class="muted">${fmtDate(a.date)} · <span class="category-pill">${esc(a.category)}</span><br>${esc(a.description || "Sin descripción.")}</p>
      ${a.place ? `<a class="small-btn" href="${esc(mapsLink(a.place))}" target="_blank" rel="noopener noreferrer">Abrir ubicación</a>` : ""}
    </article>`).join("");
}

// ── Historial público ─────────────────────────────────────────────────────────
function renderPublicHistory(t) {
  const items = [...(t.statusHistory || [])]
    .sort((a, b) => String(b.changedAt || "").localeCompare(String(a.changedAt || "")))
    .slice(0, 5);
  if (!items.length) {
    publicStatusHistory.innerHTML = '<div class="empty-state">Aún no hay cambios de estado para mostrar.</div>';
    return;
  }
  publicStatusHistory.innerHTML = items.map(h => `
    <article class="history-entry">
      <strong>${esc(h.newStatus || "Estado actualizado")}</strong>
      <p class="muted">${fmtDateTime(h.changedAt)}${h.location ? " · " + esc(h.location) : ""}</p>
      <p class="muted">Actualización registrada por WayTure.</p>
    </article>`).join("");
}

// ── Render resultado completo ─────────────────────────────────────────────────
function renderTrip(t) {
  const status = normalizeStatus(t.status);
  const dur    = tripDuration(t.startDate, t.endDate);

  trackingResult.classList.add("is-visible");
  resultDestination.textContent = t.destination || "Destino";
  resultCode.textContent        = t.code || "Sin código";
  resultCodeRepeat.textContent  = t.code || "Sin código";

  // FIX: muestra el estado con su pill de color
  resultStatus.innerHTML = `<span class="status-pill ${statusClass(status)}">${esc(status)}</span>`;

  resultLocation.textContent = t.lastLocation || t.destination || "Sin ubicación";

  // FIX: muestra fecha de finalización o "En curso" con duración
  if (status === "Finalizado") {
    resultFinished.textContent = fmtDateTime(t.finishedAt);
  } else if (status === "En curso") {
    resultFinished.textContent = "En curso" + (t.lastLocation ? " · " + t.lastLocation : "");
  } else {
    resultFinished.textContent = "Sin finalizar";
  }

  // FIX: incluye duración junto a las fechas
  resultStart.textContent = fmtDate(t.startDate);
  resultEnd.textContent   = dur ? `${fmtDate(t.endDate)} (${dur})` : fmtDate(t.endDate);

  resultMapCaption.textContent = "Última ubicación: " + (t.lastLocation || t.destination || "Sin ubicación");
  trackingMap.src = mapUrl(t.mapQuery || t.lastLocation || t.destination);

  renderProgress(status);
  renderItinerary(t);
  renderPublicHistory(t);
}

// ── Búsqueda en Firestore ─────────────────────────────────────────────────────
// FIX: busca por el campo "code" (nombre real del campo en Firestore)
async function findTripByCode(code) {
  const c = clean(code).toUpperCase();
  if (!c) return null;
  const snap = await getDocs(query(collection(db, "viajes"), where("code", "==", c)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data(), status: normalizeStatus(d.data().status) };
}

async function searchTracking(code) {
  try {
    trackingMessage.textContent = "Consultando el viaje en WayTure...";
    const t = await findTripByCode(code);
    if (!t) {
      trackingResult.classList.remove("is-visible");
      trackingMessage.textContent = "No encontramos ningún viaje con ese código. Verifica que esté escrito correctamente.";
      return;
    }
    trackingMessage.textContent = "";
    renderTrip(t);
  } catch (error) {
    console.error("Error consultando rastreo:", error);
    trackingResult.classList.remove("is-visible");
    trackingMessage.textContent = "No pudimos cargar el rastreo. Intenta de nuevo en un momento.";
  }
}

// ── Eventos ───────────────────────────────────────────────────────────────────
trackingForm.addEventListener("submit", e => {
  e.preventDefault();
  searchTracking(trackingCode.value);
});

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
}

const obs = new IntersectionObserver(
  es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach(el => obs.observe(el));

// FIX: carga automática desde URL — soporta tanto ?codigo= como ?code=
const params = new URLSearchParams(location.search);
const initial = params.get("codigo") || params.get("code");
if (initial) {
  trackingCode.value = initial;
  searchTracking(initial);
}
