# WayTure — Plataforma de planificación de viajes

WayTure es una aplicación web completa para planificación, gestión y rastreo de viajes. Combina una landing page visual con autenticación real, panel de usuario, panel administrativo, rastreo público por código y base de datos en tiempo real con Firebase.

Construido con **HTML5, CSS3, JavaScript ES Modules, Firebase Authentication y Cloud Firestore**, sin frameworks frontend.

---

## Demo

[https://skizm07.github.io/WayTure/](https://skizm07.github.io/WayTure/)

---

## Características principales

- Landing page con hero animado, destinos, planificador de presupuesto, mapa embebido, multimedia y formularios
- Registro e inicio de sesión con Firebase Authentication (email o alias de usuario)
- Roles diferenciados: `usuario` y `admin`
- Panel de usuario para gestionar viajes propios y datos de cuenta
- Panel administrativo completo con sidebar de navegación y actualizaciones en tiempo real
- Rastreo público de viajes mediante código único (ej. `WT-PARIS-1234`)
- Chat widget de gestión rápida para registrar viajes pegando texto libre
- Gestión de formularios de contacto y suscripciones con seguimiento por administrador
- Persistencia local para presupuesto, notas y preferencias

---

## Estructura del proyecto

```text
waytyre_fixed/
├── index.html               — Landing page principal
├── login.html               — Inicio de sesión
├── registro.html            — Registro de cuentas
├── panel-usuario.html       — Panel del usuario autenticado
├── rastreo-viaje.html       — Rastreo público de viajes
├── admin-viajes.html        — Panel privado de administración
├── README.md
├── MANUAL_ADMIN.md          — Manual completo del administrador
├── EXPLICACION_PROYECTO.md  — Documentación técnica para presentación
├── assets/
│   ├── WayTureNoMAP.png
│   ├── LogoWayTure.png
│   ├── fondo.jpg / paris.jpg / playa.jpg / montana.jpg ...
│   ├── viaje.mp4 / viaje.mp3
│   └── favicon.ico
├── css/
│   ├── index.css            — Estilos de la landing
│   ├── login.css            — Estilos de login y registro
│   ├── registro.css
│   ├── rastreo-viaje.css    — Estilos compartidos de paneles
│   └── admin-viajes.css     — Estilos del panel admin + chat widget
└── js/
    ├── firebase-config.js   — Configuración e inicialización de Firebase
    ├── auth-state.js        — Estado global de sesión (todas las páginas)
    ├── index-page.js        — Lógica de la landing
    ├── login-page.js        — Login con resolución de alias
    ├── register-page.js     — Registro de usuario
    ├── tracking-page.js     — Rastreo y panel de usuario
    ├── admin-page.js        — Panel administrativo + tiempo real
    └── chat-admin.js        — Chat widget de gestión rápida
```

---

## Flujo por rol

### Usuario

Después de registrarse o iniciar sesión, el usuario accede a `panel-usuario.html` donde puede:

- Crear viajes propios con código público de rastreo
- Ver viajes asignados a su correo por un administrador
- Consultar estado, itinerario, mapa y presupuesto de cada viaje
- Editar datos básicos de sus viajes
- Gestionar datos de cuenta y solicitar cambio de contraseña

### Administrador

El administrador accede a `admin-viajes.html` (requiere rol `admin` en Firestore). Desde allí puede:

- Ver todos los viajes con actualizaciones en tiempo real entre pestañas
- Crear viajes y asignarlos a usuarios por correo
- Gestionar estado, ubicación, mapa, itinerario, presupuesto y notas de cada viaje
- Agregar y editar destinos recomendados
- Ver y gestionar formularios de contacto y suscripciones de newsletter
- Exportar todos los datos en formato JSON
- Usar el **chat widget** para registrar viajes pegando texto libre

---

## Colecciones de Firestore

### `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | string | ID de Firebase Auth |
| `nombre` | string | Nombre completo |
| `alias` | string | Nombre de usuario |
| `email` | string | Correo registrado |
| `rol` | string | `usuario` o `admin` |
| `creadoEn` | timestamp | Fecha de creación |

### `viajes`
| Campo | Tipo | Descripción |
|---|---|---|
| `code` | string | Código único (ej. `WT-PARIS-1234`) |
| `destination` | string | Destino principal |
| `startDate` / `endDate` | string | Fechas en formato ISO |
| `travelers` | number | Número de viajeros |
| `experience` | string | Tipo de experiencia |
| `status` | string | Estado actual del viaje |
| `lastLocation` | string | Última ubicación registrada |
| `mapQuery` | string | Búsqueda para Google Maps |
| `transport` / `hotel` / `food` / `activitiesCost` | number | Presupuesto por categoría |
| `notes` | string | Notas del administrador |
| `itinerary` | array | Lista de actividades con hora, lugar y categoría |
| `statusHistory` | array | Historial de cambios de estado |
| `userEmail` / `userId` | string | Usuario asignado |
| `createdBy` / `createdAt` / `updatedAt` | — | Trazabilidad |

### `contactos`
| Campo | Tipo | Descripción |
|---|---|---|
| `name` / `email` | string | Datos del solicitante |
| `destination` / `message` | string | Contenido del formulario |
| `status` | string | `pendiente`, `en gestion`, `gestionado`, `archivado` |
| `adminNote` | string | Nota interna del administrador |
| `managedBy` | string | UID del admin que lo gestionó |
| `managedByName` | string | Nombre del admin visible en el panel |
| `createdAt` / `updatedAt` | timestamp | Fechas |

### `suscripciones`
| Campo | Tipo | Descripción |
|---|---|---|
| `email` | string | Correo suscrito |
| `status` | string | `activa` o `archivada` |
| `source` | string | Origen del formulario |
| `managedBy` | string | Admin que la gestionó |

### `destinosRecomendados`
| Campo | Tipo | Descripción |
|---|---|---|
| `name` / `image` / `description` | string | Información del destino |
| `rating` | number | Valoración de 0 a 5 |
| `mapLink` | string | Enlace a Google Maps |
| `createdBy` / `createdAt` | — | Trazabilidad |

---

## APIs utilizadas

| API | Uso |
|---|---|
| **Firebase Authentication** | Registro, login, logout, estado de sesión |
| **Cloud Firestore** | Base de datos con listeners en tiempo real (`onSnapshot`) |
| **Google Maps Embed** | Iframe de mapa en rastreo y panel admin |
| **Canvas 2D** | Escena de horizonte animada en la landing |
| **IntersectionObserver** | Animaciones de entrada `.reveal` |
| **localStorage** | Presupuesto, notas y preferencias locales |
| **Clipboard API** | Copiar código de viaje en el panel admin |

---

## Persistencia local (`localStorage`)

| Clave | Contenido |
|---|---|
| `wayture_logged_user` | Nombre del usuario autenticado |
| `wayture_user_role` | Rol (`usuario` o `admin`) |
| `wayture_budget` | Presupuesto guardado en la landing |
| `wayture_note` | Nota editable de la landing |
| `wayture_favorite_destination` | Destino favorito de la landing |

---

## Configuración de Firebase

Editar `js/firebase-config.js` con los datos del proyecto Firebase:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

En Firebase Console habilitar:
1. **Authentication > Sign-in method > Email/Password**
2. **Firestore Database** (modo producción o prueba)

---

## Cómo ejecutar en local

No requiere instalación de dependencias ni proceso de build.

**Opción recomendada — Live Server (VS Code):**
1. Abrir la carpeta del proyecto en VS Code
2. Instalar la extensión **Live Server**
3. Clic derecho sobre `index.html` → **Open with Live Server**

Los módulos ES y Firebase requieren servidor HTTP local. No funciona abriendo el archivo directamente en el navegador con `file://`.

---

## Tecnologías utilizadas

- HTML5 semántico (secciones, article, aside, nav, figure)
- CSS3 — custom properties, Flexbox, CSS Grid, animaciones, media queries
- JavaScript ES Modules (sin bundler)
- Firebase Authentication v10
- Cloud Firestore v10 con listeners en tiempo real
- Google Maps Embed API
- Canvas API
- SVG animado
- IntersectionObserver API
- localStorage / sessionStorage
- Audio y video nativos HTML5

---

## Autoría

- Juan Rojas
- Santiago Cardenas
- Juan Fajardo
- Alejandro Tole
- 2026 — Ingeniería Web
