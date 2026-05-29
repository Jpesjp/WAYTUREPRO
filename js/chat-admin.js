// Chat de gestión rápida — parsea texto pegado y rellena el formulario de viajes

const MONTHS_ES = {
  enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
  julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12
};

const EXPERIENCE_MAP = [
  ['cultural','Cultural'],['museos','Cultural'],['historia','Cultural'],
  ['aventura','Aventura'],['trekking','Aventura'],['senderismo','Aventura'],
  ['descanso','Descanso'],['relax','Descanso'],['playa','Descanso'],
  ['gastro','Gastronómica'],['gastronomia','Gastronómica'],['comida','Gastronómica'],
  ['familiar','Familiar'],['familia','Familiar'],
  ['compras','Tecnología y compras'],['shopping','Tecnología y compras'],['tecnologia','Tecnología y compras']
];

const STATUS_MAP = [
  ['por planear','Por planear'],['pendiente','Por planear'],
  ['organizacion','En organización'],['organizando','En organización'],
  ['reservado','Reservado'],['confirmado','Reservado'],
  ['en curso','En curso'],['viajando','En curso'],
  ['reprogramado','Reprogramado'],['cancelado','Reprogramado'],
  ['finalizado','Finalizado'],['terminado','Finalizado'],['completado','Finalizado']
];

function esc(t) {
  return String(t??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function toISO(d,m,y){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }

function extractDates(text) {
  const f=[];
  let m;
  const r1=/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
  while((m=r1.exec(text))!==null) f.push(toISO(m[1],m[2],m[3]));
  const r2=/\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while((m=r2.exec(text))!==null){ if(!f.includes(m[0])) f.push(m[0]); }
  const r3=/(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/gi;
  while((m=r3.exec(text))!==null){
    const mo=MONTHS_ES[m[2].toLowerCase()]; if(mo) f.push(toISO(m[1],mo,m[3]));
  }
  return [...new Set(f)];
}

// Parser para formato estructurado (Clave: Valor)
function parseStructured(raw) {
  const r={};
  for(const line of raw.split('\n')){
    const ci=line.indexOf(':');
    if(ci<1||ci>30) continue;
    const k=norm(line.slice(0,ci)), v=line.slice(ci+1).trim();
    if(!v) continue;
    if(/destino/.test(k))                         r.destination=v.slice(0,80);
    else if(/salida|inicio|start|partida/.test(k)){ const d=extractDates(v); if(d[0]) r.startDate=d[0]; }
    else if(/regreso|fin|end|vuelta|retorno|llegada/.test(k)){ const d=extractDates(v); if(d[0]) r.endDate=d[0]; }
    else if(/viajero|persona|pax|adulto|pasajero/.test(k)){ const n=parseInt(v); if(n>0) r.travelers=n; }
    else if(/correo|email/.test(k)){ const e=v.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i); if(e) r.email=e[0].toLowerCase(); }
    else if(/experiencia|tipo/.test(k)){ for(const[kk,vv] of EXPERIENCE_MAP){ if(norm(v).includes(kk)){r.experience=vv;break;} } }
    else if(/estado/.test(k)){ for(const[kk,vv] of STATUS_MAP){ if(norm(v).includes(kk)){r.status=vv;break;} } }
  }
  return r;
}

// Parser de texto libre
function parseFree(raw) {
  const r={};
  const en=raw.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i); if(en) r.email=en[0].toLowerCase();
  const dates=extractDates(raw); if(dates[0]) r.startDate=dates[0]; if(dates[1]) r.endDate=dates[1];
  const tv=raw.match(/(\d+)\s*(?:viajero[s]?|persona[s]?|pax|adulto[s]?|pasajero[s]?)/i); if(tv) r.travelers=parseInt(tv[1]);
  const n=norm(raw);
  for(const[k,v] of EXPERIENCE_MAP){ if(n.includes(k)){r.experience=v;break;} }
  for(const[k,v] of STATUS_MAP)    { if(n.includes(k)){r.status=v;break;} }
  // Destino: limpiar patrones conocidos y tomar el primer fragmento significativo
  const clean=raw
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi,'')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g,'')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g,'')
    .replace(/(\d{1,2})\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4}/gi,'')
    .replace(/\d+\s*(?:viajero[s]?|persona[s]?|pax|adulto[s]?|pasajero[s]?)/gi,'')
    .replace(/\b(?:al|del?|hasta|desde|para|hacia|salida|regreso|correo|email|viaje|fecha|estado)\b/gi,' ')
    .replace(/[·,;:|]+/g,' ').replace(/\s+/g,' ').trim();
  const first=clean.split(/\s{2,}|\n/)[0].trim().slice(0,80);
  if(first.length>2) r.destination=first;
  return r;
}

function parseTripText(raw) {
  const structured=parseStructured(raw);
  const free=parseFree(raw);
  return {...free,...structured};
}

function fillTripForm(p) {
  const f=document.getElementById('tripForm'); if(!f) return;
  if(p.destination) f.destination.value=p.destination;
  if(p.email)       f.assignedEmail.value=p.email;
  if(p.startDate)   f.startDate.value=p.startDate;
  if(p.endDate)     f.endDate.value=p.endDate;
  if(p.travelers)   f.travelers.value=p.travelers;
  if(p.experience)  f.experience.value=p.experience;
  if(p.status)      f.tripStatus.value=p.status;
}

function summaryLines(p) {
  return [
    p.destination && `<strong>Destino:</strong> ${esc(p.destination)}`,
    p.startDate   && `<strong>Salida:</strong> ${p.startDate}`,
    p.endDate     && `<strong>Regreso:</strong> ${p.endDate}`,
    p.travelers   && `<strong>Viajeros:</strong> ${p.travelers}`,
    p.experience  && `<strong>Experiencia:</strong> ${esc(p.experience)}`,
    p.status      && `<strong>Estado:</strong> ${esc(p.status)}`,
    p.email       && `<strong>Viajero:</strong> ${esc(p.email)}`
  ].filter(Boolean);
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const widget   = document.getElementById('chatWidget');
const toggle   = document.getElementById('chatToggle');
const panel    = document.getElementById('chatPanel');
const closeBtn = document.getElementById('chatClose');
const input    = document.getElementById('chatInput');
const msgs     = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');

if (widget) {
  function addMsg(html, type='bot') {
    const d=document.createElement('div');
    d.className=`chat-msg ${type}`;
    d.innerHTML=html;
    msgs.appendChild(d);
    msgs.scrollTop=msgs.scrollHeight;
    return d;
  }

  const openPanel  = () => { panel.removeAttribute('hidden'); toggle.setAttribute('aria-expanded','true');  input.focus(); };
  const closePanel = () => { panel.setAttribute('hidden','');  toggle.setAttribute('aria-expanded','false'); };

  toggle.addEventListener('click', () => panel.hasAttribute('hidden') ? openPanel() : closePanel());
  closeBtn.addEventListener('click', closePanel);

  // Acciones rápidas
  document.querySelectorAll('.chat-chip').forEach(btn => btn.addEventListener('click', () => {
    const q = btn.dataset.quick;
    if (q === 'viaje') {
      input.value = 'Destino:\nFecha salida (DD/MM/AAAA):\nFecha regreso (DD/MM/AAAA):\nViajeros:\nCorreo del viajero:\nExperiencia: Cultural\nEstado: Por planear';
      input.focus();
      input.selectionStart = 9; input.selectionEnd = 9;
    }
    if (q === 'contactos') {
      closePanel();
      document.getElementById('adminRequestsPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (q === 'estado') {
      addMsg(
        'Para actualizar el estado de un viaje:<br>' +
        '1. Pulsa <strong>Ver detalle</strong> en el viaje de la lista<br>' +
        '2. Abre la pestaña <strong>Estado y mapa</strong><br>' +
        '3. Selecciona el nuevo estado y pulsa <strong>Actualizar</strong>.',
        'bot'
      );
    }
  }));

  // Procesar mensaje
  function process() {
    const raw = input.value.trim();
    if (!raw) return;
    addMsg(esc(raw).replace(/\n/g,'<br>'), 'user');
    input.value = '';
    msgs.querySelector('.paste-hint')?.remove();

    const p = parseTripText(raw);
    const ok = p.destination || p.startDate || p.email || p.travelers;

    if (!ok) {
      addMsg(
        'No pude identificar datos de viaje en ese texto.<br>' +
        'Prueba con un formato como:<br>' +
        '<em>París, Francia · 15/06/2026 al 22/06/2026 · 2 viajeros · juan@correo.com</em><br><br>' +
        'O usa <strong>+ Plantilla</strong> para guiarte.',
        'bot'
      );
      return;
    }

    fillTripForm(p);
    const lines = summaryLines(p);
    addMsg(
      `Datos extraídos:<br>` +
      `<ul style="margin:8px 0 8px 18px;line-height:2">${lines.map(l=>`<li>${l}</li>`).join('')}</ul>` +
      `Formulario completado. ` +
      `<a class="chat-action-link" href="#trip-form-card" ` +
      `onclick="document.getElementById('trip-form-card').scrollIntoView({behavior:'smooth',block:'start'});return false;">` +
      `Ir al formulario →</a>`,
      'success'
    );
    setTimeout(() => document.getElementById('trip-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
  }

  chatForm.addEventListener('submit', e => { e.preventDefault(); process(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); process(); }
  });

  // Indicador al pegar
  input.addEventListener('paste', () => {
    setTimeout(() => {
      if (input.value.trim().length > 15 && !msgs.querySelector('.paste-hint')) {
        addMsg('Texto pegado. Pulsa <strong>Enviar</strong> o <kbd>Ctrl+Enter</kbd> para procesarlo.', 'system paste-hint');
      }
    }, 80);
  });
}
