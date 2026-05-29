import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection, addDoc, getDocs, onSnapshot, query, where, orderBy, doc, getDoc,
  updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const moneyFormatter = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const TRIP_STATUSES  = ["Por planear", "En organización", "Reservado", "En curso", "Reprogramado", "Finalizado"];

const privateGate              = document.getElementById("privateGate");
const adminDashboard           = document.getElementById("adminDashboard");
const sessionInfo              = document.getElementById("sessionInfo");
const tripForm                 = document.getElementById("tripForm");
const tripFormTitle            = document.getElementById("tripFormTitle");
const tripSubmitBtn            = document.getElementById("tripSubmitBtn");
const cancelTripEditBtn        = document.getElementById("cancelTripEditBtn");
const tripFormMessage          = document.getElementById("tripFormMessage");
const tripFilters              = document.getElementById("tripFilters");
const clearFiltersBtn          = document.getElementById("clearFiltersBtn");
const tripList                 = document.getElementById("tripList");
const clearTripsBtn            = document.getElementById("clearTripsBtn");
const exportTripsBtn           = document.getElementById("exportTripsBtn");
const logoutBtn                = document.getElementById("logoutBtn");
const metricTrips              = document.getElementById("metricTrips");
const metricActive             = document.getElementById("metricActive");
const metricActivities         = document.getElementById("metricActivities");
const metricBudget             = document.getElementById("metricBudget");
const selectedTripTitle        = document.getElementById("selectedTripTitle");
const selectedTripCode         = document.getElementById("selectedTripCode");
const selectedTripMeta         = document.getElementById("selectedTripMeta");
const editStatus               = document.getElementById("editStatus");
const editLastLocation         = document.getElementById("editLastLocation");
const editMapQuery             = document.getElementById("editMapQuery");
const statusComment            = document.getElementById("statusComment");
const statusMessage            = document.getElementById("statusMessage");
const adminMap                 = document.getElementById("adminMap");
const mapCaption               = document.getElementById("mapCaption");
const statusHistoryList        = document.getElementById("statusHistoryList");
const selectedClosedSummary    = document.getElementById("selectedClosedSummary");
const activityList             = document.getElementById("activityList");
const activitySubmitBtn        = document.getElementById("activitySubmitBtn");
const cancelActivityEditBtn    = document.getElementById("cancelActivityEditBtn");
const activityMessage          = document.getElementById("activityMessage");
const transportBudget          = document.getElementById("transportBudget");
const hotelBudget              = document.getElementById("hotelBudget");
const foodBudget               = document.getElementById("foodBudget");
const activitiesBudget         = document.getElementById("activitiesBudget");
const outTransport             = document.getElementById("outTransport");
const outHotel                 = document.getElementById("outHotel");
const outFoodActivities        = document.getElementById("outFoodActivities");
const outBudgetTotal           = document.getElementById("outBudgetTotal");
const personalNotes            = document.getElementById("personalNotes");
const statusForm               = document.getElementById("statusForm");
const activityForm             = document.getElementById("activityForm");
const budgetForm               = document.getElementById("budgetForm");
const notesForm                = document.getElementById("notesForm");
const destinationForm          = document.getElementById("destinationForm");
const destinationSubmitBtn     = document.getElementById("destinationSubmitBtn");
const cancelDestinationEditBtn = document.getElementById("cancelDestinationEditBtn");
const destinationMessage       = document.getElementById("destinationMessage");
const recommendationGrid       = document.getElementById("recommendationGrid");
const metricContacts           = document.getElementById("metricContacts");
const refreshRequestsBtn       = document.getElementById("refreshRequestsBtn");
const contactRequestsList      = document.getElementById("contactRequestsList");
const subscriptionRequestsList = document.getElementById("subscriptionRequestsList");
const mainNav                  = document.getElementById("mainNav");
const menuToggle               = document.getElementById("menuToggle");

let currentUser = null, currentProfile = null, unsubscribers = [];
let viajes = [], destinos = [], contactos = [], suscripciones = [];
let selectedId = null, editingTripId = null, editingActivityId = null, editingDestinationId = null;

// ── Utilidades ────────────────────────────────────────────────────────────────
function esc(text) {
  return String(text ?? "").replace(/[&<>'"]/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function clean(text) { return String(text || "").trim(); }
function normalizeForSearch(text) {
  return clean(text).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function normalizeStatus(status) {
  const r = normalizeForSearch(status);
  if (r.includes("organ"))  return "En organización";
  if (r.includes("reserv")) return "Reservado";
  if (r.includes("curso"))  return "En curso";
  if (r.includes("final"))  return "Finalizado";
  if (r.includes("reprogram")||r.includes("incid")||r.includes("cambio")) return "Reprogramado";
  return "Por planear";
}
function statusClass(s) {
  const n = normalizeStatus(s);
  if (n==="En organización") return "organizacion";
  if (n==="Reservado")       return "reservado";
  if (n==="En curso")        return "curso";
  if (n==="Reprogramado")    return "reprogramado";
  if (n==="Finalizado")      return "finalizado";
  return "planear";
}
function mapUrl(q)   { return "https://www.google.com/maps?q="+encodeURIComponent(q||"Europa turismo")+"&output=embed"; }
function mapsLink(q) { return "https://maps.google.com/?q="+encodeURIComponent(q||""); }
function genId()     { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random().toString(16).slice(2); }
function budget(t)   { return Number(t.transport||0)+Number(t.hotel||0)+Number(t.food||0)+Number(t.activitiesCost||0); }
function fmtDate(d) {
  if (!d) return "Sin fecha";
  const dt = new Date(d+"T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("es-CO",{year:"numeric",month:"short",day:"numeric"});
}
function fmtDateTime(v) {
  if (!v) return "Sin fecha";
  const dt = v.seconds ? new Date(v.seconds*1000) : new Date(v);
  return isNaN(dt) ? "Sin fecha" : dt.toLocaleString("es-CO",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
// FIX: muestra duración en noches cuando hay fechas válidas
function tripDuration(s, e) {
  if (!s || !e) return "";
  const n = Math.round((new Date(e)-new Date(s))/86400000);
  return n>0 ? (n===1?"1 noche":`${n} noches`) : "";
}
function makeCode(dest) {
  const slug = clean(dest).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,14).toUpperCase()||"VIAJE";
  return `WT-${slug}-${Math.floor(1000+Math.random()*9000)}`;
}
// FIX: usa el campo "code" (no "codigo") para coincidir con la colección real
async function codeExists(code) {
  const snap = await getDocs(query(collection(db,"viajes"),where("code","==",code)));
  return !snap.empty;
}
async function makeUniqueCode(dest) {
  for (let i=0;i<30;i++) { const c=makeCode(dest); if (!(await codeExists(c))) return c; }
  return `WT-${Date.now()}`;
}
function selectedTrip() { return viajes.find(v=>v.id===selectedId)||null; }
function setMessage(el,text,type="success") {
  if (!el) return; el.textContent=text||""; el.className=type==="error"?"warning":"success";
}
function statusOptions(sel) {
  const n=normalizeStatus(sel);
  return TRIP_STATUSES.map(s=>`<option value="${esc(s)}"${s===n?" selected":""}>${esc(s)}</option>`).join("");
}
function makeHistoryEntry(prev,next,loc,comment="") {
  return { id:genId(), previousStatus:prev?normalizeStatus(prev):"Sin estado previo",
    newStatus:normalizeStatus(next), changedAt:new Date().toISOString(),
    location:clean(loc), comment:clean(comment) };
}
function historyItems(t) {
  return [...(t?.statusHistory||[])].sort((a,b)=>String(b.changedAt||"").localeCompare(String(a.changedAt||"")));
}
function validateDates(s,e) {
  if (!s||!e) throw new Error("Completa fecha de salida y fecha de regreso.");
  if (e<s)    throw new Error("La fecha de regreso no puede ser anterior a la fecha de salida.");
}
function buildTripData(fd,assigned) {
  const destination = clean(fd.get("destination"));
  const startDate   = fd.get("startDate");
  const endDate     = fd.get("endDate");
  const travelers   = Number(fd.get("travelers"))||0;
  const email       = clean(fd.get("assignedEmail")).toLowerCase();
  if (!destination) throw new Error("El destino principal es obligatorio.");
  validateDates(startDate,endDate);
  if (travelers<1)  throw new Error("El número de viajeros debe ser mayor a cero.");
  return {
    destination, startDate, endDate, travelers,
    experience:   fd.get("experience")||"Cultural",
    status:       normalizeStatus(fd.get("tripStatus")),
    mapQuery:     clean(fd.get("mapQuery"))||destination,
    lastLocation: clean(fd.get("lastLocation"))||destination,
    userEmail:    email,
    userId:       assigned?.uid||assigned?.id||"",
    lastUpdate:   new Date().toISOString(),
    updatedAt:    serverTimestamp()
  };
}

// ── Layout ────────────────────────────────────────────────────────────────────
function showBlocked(msg) {
  if (privateGate) {
    privateGate.classList.remove("is-hidden");
    privateGate.innerHTML=`<article class="access-card"><span class="eyebrow">Acceso restringido</span><h2>${msg}</h2><p class="muted">Inicia sesión con una cuenta de administrador para gestionar viajes.</p><div class="compact-actions blocked-actions"><a class="btn btn-primary" href="login.html">Ir a login</a><a class="btn btn-secondary" href="index.html">Volver al inicio</a></div></article>`;
  }
  if (adminDashboard) adminDashboard.classList.remove("is-visible");
}
function showDashboard() {
  if (privateGate)    privateGate.classList.add("is-hidden");
  if (adminDashboard) adminDashboard.classList.add("is-visible");
}
async function getUserByEmail(email) {
  const e=clean(email).toLowerCase(); if(!e) return null;
  const snap=await getDocs(query(collection(db,"usuarios"),where("email","==",e)));
  if(snap.empty) return null;
  const d=snap.docs[0]; return {id:d.id,...d.data()};
}

// ── Escuchas en tiempo real (actualiza todas las pestañas abiertas) ───────────
function initRealtimeListeners() {
  unsubscribers.forEach(u=>u());
  unsubscribers=[];
  unsubscribers.push(onSnapshot(
    query(collection(db,"viajes"),orderBy("createdAt","desc")),
    snap=>{
      viajes=snap.docs.map(d=>({id:d.id,...d.data(),status:normalizeStatus(d.data().status)}));
      if(!selectedId&&viajes[0]) selectedId=viajes[0].id;
      renderMetrics(); renderTrips(); renderSelected();
    }
  ));
  unsubscribers.push(onSnapshot(
    query(collection(db,"destinosRecomendados"),orderBy("createdAt","desc")),
    snap=>{
      destinos=snap.docs.map(d=>({id:d.id,...d.data()}));
      renderRecommended();
    }
  ));
  unsubscribers.push(onSnapshot(
    query(collection(db,"contactos"),orderBy("createdAt","desc")),
    snap=>{
      contactos=snap.docs.map(d=>({id:d.id,...d.data()}));
      renderMetrics(); renderRequests();
    }
  ));
  unsubscribers.push(onSnapshot(
    query(collection(db,"suscripciones"),orderBy("createdAt","desc")),
    snap=>{
      suscripciones=snap.docs.map(d=>({id:d.id,...d.data()}));
      renderRequests();
    }
  ));
}

// ── Filtrado ──────────────────────────────────────────────────────────────────
function filteredTrips() {
  if(!tripFilters) return viajes;
  const d=new FormData(tripFilters);
  const code=normalizeForSearch(d.get("code")), dest=normalizeForSearch(d.get("destination")),
        status=clean(d.get("status")), assigned=normalizeForSearch(d.get("assigned")),
        startDate=clean(d.get("startDate"));
  return viajes.filter(t=>
    (!code     || normalizeForSearch(t.code).includes(code))&&
    (!dest     || normalizeForSearch(t.destination).includes(dest))&&
    (!status   || normalizeStatus(t.status)===normalizeStatus(status))&&
    (!assigned || normalizeForSearch(`${t.userEmail||""} ${t.userId||""}`).includes(assigned))&&
    (!startDate|| t.startDate===startDate)
  );
}

// ── Render métricas ───────────────────────────────────────────────────────────
function renderMetrics() {
  metricTrips.textContent     =viajes.length;
  metricActive.textContent    =viajes.filter(t=>["En organización","Reservado","En curso","Reprogramado"].includes(normalizeStatus(t.status))).length;
  metricActivities.textContent=viajes.reduce((s,t)=>s+(t.itinerary||[]).length,0);
  metricBudget.textContent    =moneyFormatter.format(viajes.reduce((s,t)=>s+budget(t),0));
  if(metricContacts) metricContacts.textContent=contactos.filter(c=>c.status!=="gestionado"&&c.status!=="archivado").length;
}

// ── Render lista de viajes ────────────────────────────────────────────────────
function renderTrips() {
  if(!viajes.length){ tripList.innerHTML='<div class="empty-state">Todavía no hay viajes registrados. Crea el primero desde el formulario.</div>'; return; }
  const items=filteredTrips();
  if(!items.length){ tripList.innerHTML='<div class="empty-state">No encontramos viajes con esos filtros. Ajusta la búsqueda o limpia los filtros.</div>'; return; }
  tripList.innerHTML=items.map(t=>{
    const st=normalizeStatus(t.status), dur=tripDuration(t.startDate,t.endDate);
    return `<article class="trip-card ${t.id===selectedId?"selected":""} ${st==="Finalizado"?"is-finalized":""}">
      <div class="trip-card-top">
        <div>
          <strong class="trip-dest">${esc(t.destination)}</strong>
          <p class="muted">${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}${dur?" · "+esc(dur):""}</p>
          <p class="muted trip-assigned">${esc(t.userEmail||"Sin usuario asignado")} · ${esc(t.travelers)} viajero(s)</p>
        </div>
        <div class="trip-card-badges">
          <span class="status-pill ${statusClass(st)}">${esc(st)}</span>
          <span class="category-pill">${esc(t.experience)}</span>
        </div>
      </div>
      <div class="trip-card-sub">
        <span class="code-pill">${esc(t.code)}</span>
        <span class="muted">${st==="Finalizado"?"Cerrado: "+fmtDateTime(t.finishedAt):"Presupuesto: "+moneyFormatter.format(budget(t))}</span>
      </div>
      <div class="trip-card-actions">
        <div class="trip-primary-acts">
          <button class="small-btn accent-btn" data-action="select" data-id="${t.id}">Ver detalle</button>
          <button class="small-btn" data-action="edit" data-id="${t.id}">Editar</button>
        </div>
        <div class="trip-secondary-acts">
          <button class="small-btn" data-action="copy" data-code="${esc(t.code)}">Copiar código</button>
          <button class="small-btn" data-action="track" data-code="${esc(t.code)}">Rastrear</button>
          <button class="small-btn danger" data-action="delete" data-id="${t.id}">Eliminar</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

// ── Render viaje seleccionado ─────────────────────────────────────────────────
function renderSelected() {
  const t=selectedTrip();
  if(!t){
    selectedTripTitle.textContent="Selecciona un viaje"; selectedTripCode.textContent="Sin código";
    selectedTripMeta.textContent="Elige un viaje para editarlo.";
    adminMap.src=mapUrl("Europa turismo"); mapCaption.textContent="Selecciona un viaje para ver su mapa.";
    activityList.innerHTML='<div class="empty-state">Sin viaje seleccionado.</div>';
    statusHistoryList.innerHTML='<div class="empty-state">Sin historial disponible.</div>';
    selectedClosedSummary.className="closed-summary is-hidden"; return;
  }
  const st=normalizeStatus(t.status), dur=tripDuration(t.startDate,t.endDate);
  selectedTripTitle.textContent=t.destination; selectedTripCode.textContent=t.code;
  selectedTripMeta.textContent=[fmtDate(t.startDate)+" – "+fmtDate(t.endDate),dur,t.travelers+" viajero(s)",t.experience].filter(Boolean).join(" · ");
  editStatus.innerHTML=statusOptions(st);
  editLastLocation.value=t.lastLocation||""; editMapQuery.value=t.mapQuery||t.destination||"";
  transportBudget.value=t.transport||""; hotelBudget.value=t.hotel||"";
  foodBudget.value=t.food||""; activitiesBudget.value=t.activitiesCost||"";
  personalNotes.value=t.notes||"";
  adminMap.src=mapUrl(t.mapQuery||t.lastLocation||t.destination);
  mapCaption.textContent="Mapa de "+(t.lastLocation||t.destination);
  renderActivities(t); renderBudget(t); renderStatusHistory(t); renderClosedSummary(t);
}
function renderStatusHistory(t) {
  const items=historyItems(t);
  if(!items.length){ statusHistoryList.innerHTML='<div class="empty-state">Aún no hay cambios de estado registrados para este viaje.</div>'; return; }
  statusHistoryList.innerHTML=items.map(h=>`<article class="history-entry"><strong>${esc(h.previousStatus||"Sin estado previo")} → ${esc(h.newStatus||"Sin estado")}</strong><p class="muted">${fmtDateTime(h.changedAt)}${h.location?" · "+esc(h.location):""}</p><p class="muted">${esc(h.comment||"Cambio registrado desde el panel administrativo.")}</p></article>`).join("");
}
function renderClosedSummary(t) {
  if(normalizeStatus(t.status)!=="Finalizado"){ selectedClosedSummary.className="closed-summary is-hidden"; selectedClosedSummary.innerHTML=""; return; }
  const dur=tripDuration(t.startDate,t.endDate);
  selectedClosedSummary.className="closed-summary is-visible";
  selectedClosedSummary.innerHTML=`<h3>Viaje finalizado</h3><p class="muted">Cierre: ${fmtDateTime(t.finishedAt)}. ${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}${dur?" ("+dur+")":""}. Actividades: ${(t.itinerary||[]).length}. Presupuesto: ${moneyFormatter.format(budget(t))}.</p>`;
}
function renderActivities(t) {
  const items=[...(t.itinerary||[])].sort((a,b)=>String((a.date||"")+(a.time||"")).localeCompare(String((b.date||"")+(b.time||""))));
  if(!items.length){ activityList.innerHTML='<div class="empty-state">Este viaje aún no tiene actividades en el itinerario.</div>'; return; }
  activityList.innerHTML=items.map(a=>`<article class="activity-item"><div class="activity-time">${esc(a.time||"--:--")}</div><div><strong>${esc(a.place)}</strong><p class="muted">${fmtDate(a.date)} · <span class="category-pill">${esc(a.category)}</span></p><p class="muted">${esc(a.description||"Sin descripción.")}</p>${a.place?`<a class="link-btn" href="${esc(mapsLink(a.place))}" target="_blank" rel="noopener noreferrer">↗ Abrir en Maps</a>`:""}</div><div class="activity-actions"><button class="small-btn" data-action="edit-activity" data-id="${esc(a.id)}">Editar</button><button class="small-btn danger" data-action="delete-activity" data-id="${esc(a.id)}">Eliminar</button></div></article>`).join("");
}
function renderBudget(t) {
  outTransport.textContent    =moneyFormatter.format(Number(t.transport||0));
  outHotel.textContent        =moneyFormatter.format(Number(t.hotel||0));
  outFoodActivities.textContent=moneyFormatter.format(Number(t.food||0)+Number(t.activitiesCost||0));
  outBudgetTotal.textContent  =moneyFormatter.format(budget(t));
}
function renderRecommended() {
  if(!destinos.length){ recommendationGrid.innerHTML='<div class="empty-state">No hay destinos recomendados todavía.</div>'; return; }
  recommendationGrid.innerHTML=destinos.map(i=>`<article class="destination-card"><img src="${esc(i.image||"assets/fondo.jpg")}" alt="${esc(i.name)}" onerror="this.src='assets/fondo.jpg'"><div class="inner"><div class="inline-row"><strong>${esc(i.name)}</strong><span>⭐ ${esc(i.rating||"4.8")}</span></div><p class="muted">${esc(i.description||"Sin descripción.")}</p><div class="compact-actions compact-actions-spaced"><a class="link-btn" href="${esc(i.mapLink||mapsLink(i.name||""))}" target="_blank" rel="noopener noreferrer">↗ Ver en mapa</a><button class="small-btn" data-action="edit-rec" data-id="${esc(i.id)}">Editar</button><button class="small-btn danger" data-action="delete-rec" data-id="${esc(i.id)}">Eliminar</button></div></div></article>`).join("");
}
function renderRequests() {
  if(contactRequestsList) {
    contactRequestsList.innerHTML=contactos.length?contactos.map(c=>{
      const st=c.status||"pendiente";
      const stClass=st==="gestionado"?"finalizado":st==="en gestion"?"curso":st==="archivado"?"reprogramado":"planear";
      const managedLine=c.managedByName&&st!=="pendiente"
        ?`<p class="muted managed-by">Gestionado por: <strong>${esc(c.managedByName)}</strong></p>`:""
      return `<article class="request-card">
        <div class="inline-row">
          <div><strong>${esc(c.name||"Sin nombre")}</strong><p class="muted">${esc(c.email||"Sin correo")}</p></div>
          <span class="status-pill ${stClass}">${esc(st)}</span>
        </div>
        <div class="request-meta">
          <span>Destino: ${esc(c.destination||"Sin destino")}</span>
          <span>Recibido: ${fmtDateTime(c.createdAt)}</span>
        </div>
        ${managedLine}
        <p class="muted">${esc(c.message||"Sin mensaje.")}</p>
        <label for="note-contact-${esc(c.id)}">Nota administrativa</label>
        <textarea class="admin-note-input" id="note-contact-${esc(c.id)}" data-note-contact="${esc(c.id)}" placeholder="Seguimiento, respuesta pendiente, próxima acción...">${esc(c.adminNote||"")}</textarea>
        <div class="compact-actions">
          <a class="link-btn" href="mailto:${esc(c.email||"")}">↗ Responder por correo</a>
          <button class="small-btn" data-action="contact-status" data-status="pendiente" data-id="${esc(c.id)}" type="button">Pendiente</button>
          <button class="small-btn" data-action="contact-status" data-status="en gestion" data-id="${esc(c.id)}" type="button">En gestión</button>
          <button class="small-btn" data-action="contact-status" data-status="gestionado" data-id="${esc(c.id)}" type="button">Gestionado</button>
          <button class="small-btn" data-action="save-contact-note" data-id="${esc(c.id)}" type="button">Guardar nota</button>
          <button class="small-btn danger" data-action="delete-contact" data-id="${esc(c.id)}" type="button">Eliminar</button>
        </div>
      </article>`;
    }).join(""):'<div class="empty-state">No hay solicitudes de contacto guardadas.</div>';
  }
  if(subscriptionRequestsList) {
    subscriptionRequestsList.innerHTML=suscripciones.length?suscripciones.map(s=>`<article class="request-card">
      <div class="inline-row">
        <div><strong>${esc(s.email||"Sin correo")}</strong><p class="muted">Origen: ${esc(s.source||"Formulario comunidad")}</p></div>
        <span class="status-pill ${s.status==="archivada"?"finalizado":"curso"}">${esc(s.status||"activa")}</span>
      </div>
      <div class="request-meta"><span>Recibido: ${fmtDateTime(s.createdAt)}</span></div>
      <div class="compact-actions">
        <a class="link-btn" href="mailto:${esc(s.email||"")}">↗ Escribir al suscriptor</a>
        <button class="small-btn" data-action="subscription-status" data-status="activa" data-id="${esc(s.id)}" type="button">Activa</button>
        <button class="small-btn" data-action="subscription-status" data-status="archivada" data-id="${esc(s.id)}" type="button">Archivar</button>
        <button class="small-btn danger" data-action="delete-subscription" data-id="${esc(s.id)}" type="button">Eliminar</button>
      </div>
    </article>`).join(""):'<div class="empty-state">No hay suscripciones guardadas.</div>';
  }
}

// ── Formularios de edición ────────────────────────────────────────────────────
function resetTripEdit() {
  editingTripId=null; tripForm.reset();
  tripForm.tripStatus.innerHTML=statusOptions("Por planear");
  tripFormTitle.textContent="Crear nuevo viaje"; tripSubmitBtn.textContent="Registrar viaje";
  cancelTripEditBtn.classList.add("is-hidden"); setMessage(tripFormMessage,"");
}
function fillTripForm(t) {
  editingTripId=t.id;
  tripForm.destination.value=t.destination||""; tripForm.assignedEmail.value=t.userEmail||"";
  tripForm.startDate.value=t.startDate||""; tripForm.endDate.value=t.endDate||"";
  tripForm.travelers.value=t.travelers||1; tripForm.experience.value=t.experience||"Cultural";
  tripForm.tripStatus.innerHTML=statusOptions(t.status);
  tripForm.lastLocation.value=t.lastLocation||""; tripForm.mapQuery.value=t.mapQuery||"";
  tripFormTitle.textContent="Editar viaje"; tripSubmitBtn.textContent="Guardar cambios";
  cancelTripEditBtn.classList.remove("is-hidden");
  setMessage(tripFormMessage,"Editando "+(t.code||"viaje seleccionado")+".");
  tripForm.scrollIntoView({behavior:"smooth",block:"start"});
}
function resetActivityEdit() {
  editingActivityId=null; activityForm.reset();
  activitySubmitBtn.textContent="Agregar actividad";
  cancelActivityEditBtn.classList.add("is-hidden"); setMessage(activityMessage,"");
}
function fillActivityForm(a) {
  editingActivityId=a.id;
  activityForm.activityDate.value=a.date||""; activityForm.activityTime.value=a.time||"";
  activityForm.activityCategory.value=a.category||"Cultura";
  activityForm.activityPlace.value=a.place||""; activityForm.activityDescription.value=a.description||"";
  activitySubmitBtn.textContent="Guardar actividad";
  cancelActivityEditBtn.classList.remove("is-hidden");
  setMessage(activityMessage,"Editando actividad del itinerario.");
}
function resetDestinationEdit() {
  editingDestinationId=null; destinationForm.reset();
  destinationSubmitBtn.textContent="Agregar destino recomendado";
  cancelDestinationEditBtn.classList.add("is-hidden"); setMessage(destinationMessage,"");
}
function fillDestinationForm(d) {
  editingDestinationId=d.id;
  destinationForm.recName.value=d.name||""; destinationForm.recRating.value=d.rating||"";
  destinationForm.recImage.value=d.image||""; destinationForm.recMapLink.value=d.mapLink||"";
  destinationForm.recDescription.value=d.description||"";
  destinationSubmitBtn.textContent="Guardar destino recomendado";
  cancelDestinationEditBtn.classList.remove("is-hidden");
  setMessage(destinationMessage,"Editando destino recomendado.");
}

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if(!user){ showBlocked("No has iniciado sesión."); setTimeout(()=>location.href="login.html",800); return; }
  currentUser=user;
  const ps=await getDoc(doc(db,"usuarios",user.uid));
  currentProfile=ps.exists()?ps.data():{rol:"usuario",nombre:user.displayName||"usuario",email:user.email};
  if(currentProfile.rol!=="admin"){ showBlocked("No tienes permisos de administrador."); setTimeout(()=>location.href="panel-usuario.html#mis-viajes",1200); return; }
  showDashboard();
  sessionInfo.textContent=`Administrador: ${currentProfile.nombre||user.displayName||user.email} · ${user.email}`;
  tripForm.tripStatus.innerHTML=statusOptions("Por planear");
  editStatus.innerHTML=statusOptions("Por planear");
  initRealtimeListeners();
});

// ── Submit viaje ──────────────────────────────────────────────────────────────
tripForm.addEventListener("submit", async e => {
  e.preventDefault();
  const fd=new FormData(tripForm), email=clean(fd.get("assignedEmail")).toLowerCase();
  try {
    setMessage(tripFormMessage,editingTripId?"Guardando cambios...":"Creando viaje...");
    const assigned=email?await getUserByEmail(email):null;
    const tripData=buildTripData(fd,assigned);
    if(editingTripId) {
      const existing=viajes.find(t=>t.id===editingTripId);
      if(!existing) throw new Error("No se encontró el viaje que intentas editar.");
      const prev=normalizeStatus(existing.status), next=normalizeStatus(tripData.status);
      const hist=[...(existing.statusHistory||[])];
      if(prev!==next) hist.push(makeHistoryEntry(prev,next,tripData.lastLocation,"Cambio guardado desde edición completa del viaje."));
      const upd={...tripData,statusHistory:hist};
      if(next==="Finalizado"&&prev!=="Finalizado") upd.finishedAt=new Date().toISOString();
      await updateDoc(doc(db,"viajes",editingTripId),upd);
      selectedId=editingTripId; resetTripEdit();
      setMessage(tripFormMessage,"Viaje actualizado correctamente.");
    } else {
      const code=await makeUniqueCode(tripData.destination);
      const hist=[makeHistoryEntry("",tripData.status,tripData.lastLocation,"Viaje creado desde el panel administrativo.")];
      const cd={...tripData,code,statusHistory:hist,
        finishedAt:normalizeStatus(tripData.status)==="Finalizado"?new Date().toISOString():"",
        transport:0,hotel:0,food:0,activitiesCost:0,notes:"",itinerary:[],
        createdBy:currentUser.uid,createdAt:serverTimestamp()};
      const ref=await addDoc(collection(db,"viajes"),cd);
      selectedId=ref.id; tripForm.reset();
      tripForm.tripStatus.innerHTML=statusOptions("Por planear");
      const warn=email&&!assigned?" (correo no registrado; queda como referencia)":"";
      setMessage(tripFormMessage,`Viaje creado. Código público: ${code}${warn}`);
    }
  } catch(err){ console.error(err); setMessage(tripFormMessage,"No se pudo guardar el viaje: "+err.message,"error"); }
});

// ── Acciones lista de viajes ──────────────────────────────────────────────────
tripList.addEventListener("click", async e => {
  const b=e.target.closest("button[data-action]"); if(!b) return;
  try {
    if(b.dataset.action==="select") { selectedId=b.dataset.id; renderTrips(); renderSelected(); return; }
    if(b.dataset.action==="edit")   { selectedId=b.dataset.id; const t=selectedTrip(); if(t) fillTripForm(t); renderTrips(); return; }
    if(b.dataset.action==="copy")   {
      if(navigator.clipboard) await navigator.clipboard.writeText(b.dataset.code);
      b.textContent="¡Copiado!"; setTimeout(()=>b.textContent="Copiar código",1800); return;
    }
    if(b.dataset.action==="track")  { location.href="rastreo-viaje.html?codigo="+encodeURIComponent(b.dataset.code); return; }
    if(b.dataset.action==="delete") {
      if(confirm("¿Eliminar este viaje de Firebase? Esta acción no se puede deshacer.")) {
        await deleteDoc(doc(db,"viajes",b.dataset.id));
        if(selectedId===b.dataset.id) selectedId=null;
        if(editingTripId===b.dataset.id) resetTripEdit();
      }
    }
  } catch(err){ console.error(err); alert("No se pudo completar la acción: "+err.message); }
});

clearTripsBtn.addEventListener("click", async()=>{
  if(!confirm("¿Borrar TODOS los viajes de Firebase? Esta acción es permanente.")) return;
  await Promise.all(viajes.map(t=>deleteDoc(doc(db,"viajes",t.id))));
  selectedId=null; resetTripEdit();
});

exportTripsBtn.addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({viajes,destinos,contactos,suscripciones},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`wayture-datos-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
});

// ── Actualizar estado ─────────────────────────────────────────────────────────
statusForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const t=selectedTrip(); if(!t) return alert("Selecciona un viaje primero.");
  const fd=new FormData(statusForm);
  const prev=normalizeStatus(t.status), next=normalizeStatus(fd.get("editStatus"));
  const loc=clean(fd.get("editLastLocation"))||t.lastLocation||t.destination;
  const mq=clean(fd.get("editMapQuery"))||loc;
  const comment=clean(fd.get("statusComment"));
  const hist=[...(t.statusHistory||[])];
  if(prev!==next) hist.push(makeHistoryEntry(prev,next,loc,comment));
  const upd={status:next,lastLocation:loc,mapQuery:mq,statusHistory:hist,lastUpdate:new Date().toISOString(),updatedAt:serverTimestamp()};
  if(next==="Finalizado"&&prev!=="Finalizado") upd.finishedAt=new Date().toISOString();
  try {
    await updateDoc(doc(db,"viajes",selectedId),upd);
    statusComment.value="";
    setMessage(statusMessage,prev===next?"Ubicación y mapa actualizados.":"Estado actualizado e historial registrado.");
  } catch(err){ setMessage(statusMessage,"No se pudo actualizar el estado: "+err.message,"error"); }
});

// ── Actividades ───────────────────────────────────────────────────────────────
activityForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const t=selectedTrip(); if(!t) return alert("Selecciona un viaje primero.");
  const fd=new FormData(activityForm);
  const act={id:editingActivityId||genId(),date:fd.get("activityDate")||t.startDate||"",time:fd.get("activityTime"),
    place:clean(fd.get("activityPlace")),category:fd.get("activityCategory"),description:clean(fd.get("activityDescription"))};
  if(!act.time||!act.place){ setMessage(activityMessage,"La hora y el lugar de la actividad son obligatorios.","error"); return; }
  const itin=editingActivityId?(t.itinerary||[]).map(a=>a.id===editingActivityId?act:a):[...(t.itinerary||[]),act];
  try {
    await updateDoc(doc(db,"viajes",selectedId),{itinerary:itin,lastUpdate:new Date().toISOString(),updatedAt:serverTimestamp()});
    resetActivityEdit();
    setMessage(activityMessage,editingActivityId?"Actividad actualizada.":"Actividad agregada al itinerario.");
  } catch(err){ setMessage(activityMessage,"No se pudo guardar la actividad: "+err.message,"error"); }
});
activityList.addEventListener("click", async e=>{
  const b=e.target.closest("button[data-action]"),t=selectedTrip(); if(!b||!t) return;
  if(b.dataset.action==="edit-activity"){ const a=(t.itinerary||[]).find(a=>a.id===b.dataset.id); if(a) fillActivityForm(a); return; }
  if(b.dataset.action==="delete-activity"){
    const itin=(t.itinerary||[]).filter(a=>a.id!==b.dataset.id);
    await updateDoc(doc(db,"viajes",selectedId),{itinerary:itin,updatedAt:serverTimestamp()});
    if(editingActivityId===b.dataset.id) resetActivityEdit();
  }
});

// ── Presupuesto ───────────────────────────────────────────────────────────────
budgetForm.addEventListener("submit", async e=>{
  e.preventDefault(); if(!selectedId) return alert("Selecciona un viaje primero.");
  const fd=new FormData(budgetForm);
  await updateDoc(doc(db,"viajes",selectedId),{transport:Number(fd.get("transportBudget"))||0,hotel:Number(fd.get("hotelBudget"))||0,food:Number(fd.get("foodBudget"))||0,activitiesCost:Number(fd.get("activitiesBudget"))||0,lastUpdate:new Date().toISOString(),updatedAt:serverTimestamp()});
});

// ── Notas ─────────────────────────────────────────────────────────────────────
notesForm.addEventListener("submit", async e=>{
  e.preventDefault(); if(!selectedId) return alert("Selecciona un viaje primero.");
  await updateDoc(doc(db,"viajes",selectedId),{notes:clean(new FormData(notesForm).get("personalNotes")),lastUpdate:new Date().toISOString(),updatedAt:serverTimestamp()});
});

// ── Destinos recomendados ─────────────────────────────────────────────────────
destinationForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const fd=new FormData(destinationForm),name=clean(fd.get("recName")),rating=Number(fd.get("recRating"));
  if(!name){ setMessage(destinationMessage,"El nombre del destino es obligatorio.","error"); return; }
  if(Number.isNaN(rating)||rating<0||rating>5){ setMessage(destinationMessage,"La valoración debe ser un número entre 0 y 5.","error"); return; }
  const data={name,rating,image:clean(fd.get("recImage"))||"assets/fondo.jpg",description:clean(fd.get("recDescription")),mapLink:clean(fd.get("recMapLink"))||mapsLink(name),updatedAt:serverTimestamp()};
  try {
    if(editingDestinationId){ await updateDoc(doc(db,"destinosRecomendados",editingDestinationId),data); resetDestinationEdit(); setMessage(destinationMessage,"Destino recomendado actualizado."); }
    else { await addDoc(collection(db,"destinosRecomendados"),{...data,createdAt:serverTimestamp(),createdBy:currentUser.uid}); resetDestinationEdit(); setMessage(destinationMessage,"Destino recomendado agregado."); }
  } catch(err){ setMessage(destinationMessage,"No se pudo guardar el destino: "+err.message,"error"); }
});
recommendationGrid.addEventListener("click", async e=>{
  const b=e.target.closest("button[data-action]"); if(!b) return;
  if(b.dataset.action==="edit-rec"){ const d=destinos.find(i=>i.id===b.dataset.id); if(d) fillDestinationForm(d); return; }
  if(b.dataset.action==="delete-rec"){ await deleteDoc(doc(db,"destinosRecomendados",b.dataset.id)); if(editingDestinationId===b.dataset.id) resetDestinationEdit(); }
});

// ── Filtros y controles ───────────────────────────────────────────────────────
if(tripFilters){ tripFilters.addEventListener("input",renderTrips); tripFilters.addEventListener("change",renderTrips); }
if(clearFiltersBtn)        clearFiltersBtn.addEventListener("click",()=>{ tripFilters.reset(); renderTrips(); });
if(cancelTripEditBtn)        cancelTripEditBtn.addEventListener("click",resetTripEdit);
if(cancelActivityEditBtn)    cancelActivityEditBtn.addEventListener("click",resetActivityEdit);
if(cancelDestinationEditBtn) cancelDestinationEditBtn.addEventListener("click",resetDestinationEdit);
if(refreshRequestsBtn)       refreshRequestsBtn.addEventListener("click",()=>renderRequests());

// ── Solicitudes ───────────────────────────────────────────────────────────────
if(contactRequestsList) contactRequestsList.addEventListener("click", async e=>{
  const b=e.target.closest("button[data-action]"); if(!b) return;
  const adminName=currentProfile?.nombre||currentUser?.displayName||currentUser?.email||"";
  if(b.dataset.action==="contact-status") await updateDoc(doc(db,"contactos",b.dataset.id),{status:b.dataset.status,updatedAt:serverTimestamp(),managedBy:currentUser.uid,managedByName:adminName});
  if(b.dataset.action==="save-contact-note"){ const note=document.querySelector(`[data-note-contact="${b.dataset.id}"]`); await updateDoc(doc(db,"contactos",b.dataset.id),{adminNote:clean(note?.value),updatedAt:serverTimestamp(),managedBy:currentUser.uid,managedByName:adminName}); }
  if(b.dataset.action==="delete-contact"){ if(confirm("¿Eliminar esta solicitud de contacto?")) await deleteDoc(doc(db,"contactos",b.dataset.id)); }
  // snapshot actualiza automáticamente
});
if(subscriptionRequestsList) subscriptionRequestsList.addEventListener("click", async e=>{
  const b=e.target.closest("button[data-action]"); if(!b) return;
  if(b.dataset.action==="subscription-status") await updateDoc(doc(db,"suscripciones",b.dataset.id),{status:b.dataset.status,updatedAt:serverTimestamp(),managedBy:currentUser.uid});
  if(b.dataset.action==="delete-subscription"){ if(confirm("¿Eliminar esta suscripción?")) await deleteDoc(doc(db,"suscripciones",b.dataset.id)); }
  // snapshot actualiza automáticamente
});

// ── Logout ────────────────────────────────────────────────────────────────────
logoutBtn.addEventListener("click", async()=>{ unsubscribers.forEach(u=>u()); unsubscribers=[]; await signOut(auth); location.href="index.html"; });

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active"); document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
}));
document.querySelectorAll(".request-tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".request-tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".request-panel").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active"); document.getElementById("request-"+btn.dataset.requestTab).classList.add("active");
}));

// ── Menú y reveal ─────────────────────────────────────────────────────────────
if(menuToggle&&mainNav) menuToggle.addEventListener("click",()=>{ const o=mainNav.classList.toggle("is-open"); menuToggle.setAttribute("aria-expanded",String(o)); });
const obs=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) e.target.classList.add("visible"); }),{threshold:0.15});
document.querySelectorAll(".reveal").forEach(el=>obs.observe(el));
