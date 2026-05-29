# Manual del Administrador — WayTure

Este manual explica paso a paso todas las funciones disponibles para el rol de administrador en WayTure.

---

## 1. Acceso al panel

### Requisito previo
La cuenta debe tener el campo `rol: "admin"` en la colección `usuarios` de Firestore. El registro público solo crea cuentas de usuario; el rol admin se asigna manualmente desde la consola de Firebase.

### Pasos para iniciar sesión

1. Ir a `login.html`
2. Escribir el **correo** o el **alias de usuario** registrado
3. Escribir la **contraseña**
4. Pulsar **Entrar a WayTure**

El sistema detecta automáticamente si se ingresó un correo (contiene `@`) o un alias (busca en Firestore el correo asociado y autentica con él).

Después del login, el sistema redirige al panel de usuario. Para ir al panel administrativo:

- Usar el menú de usuario (esquina superior derecha) → **Panel privado**
- O ir directamente a `admin-viajes.html`

Si la cuenta no tiene rol `admin`, el sistema redirige automáticamente al panel de usuario.

---

## 2. Vista general del panel

Al entrar, el panel muestra:

```
┌────────────────────────────────────────────────────────┐
│  HEADER — Logo · Navegación · Menú de usuario          │
├────────────────────────────────────────────────────────┤
│  DASHBOARD TOP — Título · Exportar datos · Cerrar sesión│
├──────────────┬─────────────────────────────────────────┤
│              │  MÉTRICAS                               │
│   SIDEBAR    │  Viajes · Activos · Actividades ·       │
│              │  Presupuesto · Contactos                │
│  Resumen     │─────────────────────────────────────────│
│  Gestión     │  FORMULARIOS RECIBIDOS                  │
│  Formularios │  Contactos · Comunidad                  │
│  ─────────── │─────────────────────────────────────────│
│  Rastreo     │  GESTIÓN DE VIAJES                      │
│  Sitio web   │  Lista ▏ Detalle del viaje              │
└──────────────┴─────────────────────────────────────────┘
```

### Métricas en tiempo real
Las tarjetas superiores muestran contadores actualizados automáticamente:
- **Viajes registrados** — total en Firestore
- **Viajes activos** — en organización, reservados, en curso o reprogramados
- **Actividades** — total de actividades en todos los itinerarios
- **Presupuesto total** — suma de todos los presupuestos registrados
- **Contactos pendientes** — solicitudes sin gestionar

### Actualizaciones en tiempo real
El panel se actualiza automáticamente. Si hay otro administrador trabajando en otra pestaña o dispositivo, los cambios aparecen sin necesidad de recargar la página.

---

## 3. Gestión de viajes

### 3.1 Ver la lista de viajes

La lista muestra todos los viajes ordenados por fecha de creación (más reciente primero). Cada tarjeta incluye:
- Destino y fechas
- Usuario asignado y número de viajeros
- Código público (`WT-DESTINO-XXXX`)
- Estado con código de color
- Presupuesto total o fecha de cierre (si finalizado)

**Filtros disponibles:**
- Por código de viaje
- Por destino
- Por estado
- Por correo o alias del viajero
- Por fecha de salida

Para limpiar filtros: botón **Limpiar filtros**.

### 3.2 Acciones por tarjeta de viaje

| Botón | Acción |
|---|---|
| **Ver detalle** | Selecciona el viaje y carga su información en el panel derecho |
| **Editar** | Rellena el formulario de abajo con los datos del viaje para editarlos |
| **Copiar código** | Copia el código público al portapapeles |
| **Rastrear** | Abre la página de rastreo público con ese código |
| **Eliminar** | Borra el viaje de Firestore (requiere confirmación) |

### 3.3 Crear un nuevo viaje

**Opción A — Formulario manual:**
1. Pulsar **+ Nuevo viaje** en el header de la lista
2. El formulario aparece debajo de la lista
3. Completar:
   - **Destino principal** (requerido)
   - **Correo del viajero** (opcional — conecta el viaje al panel del usuario)
   - **Fechas de salida y regreso** (requerido)
   - **Número de viajeros** (requerido)
   - **Tipo de experiencia**
   - **Estado inicial**
   - **Última ubicación** y **búsqueda del mapa** (opcionales)
4. Pulsar **Registrar viaje**
5. El sistema genera automáticamente un código único y registra el historial inicial

**Opción B — Chat widget (pegar texto):**
1. Pulsar el botón azul flotante en la esquina inferior derecha
2. Pegar cualquier texto con datos del viaje (email de cliente, mensaje de WhatsApp, nota interna)
3. El sistema extrae automáticamente: destino, fechas, viajeros, correo y tipo de experiencia
4. El formulario se rellena automáticamente
5. Revisar los datos y pulsar **Registrar viaje**

**Formato que el chat entiende mejor:**
```
Destino: París, Francia
Fechas: 15/06/2026 al 22/06/2026
Viajeros: 2 personas
Correo del viajero: cliente@correo.com
Tipo de viaje: Cultural
Estado: Reservado
```

El chat también entiende texto libre como:
```
París, Francia · 15/06/2026 al 22/06/2026 · 2 viajeros · cliente@correo.com
```

### 3.4 Editar un viaje existente

1. Pulsar **Editar** en la tarjeta del viaje
2. El formulario se rellena con los datos actuales
3. Modificar los campos necesarios
4. Pulsar **Guardar cambios**
5. Para cancelar sin guardar: pulsar **Cancelar edición**

### 3.5 Panel de detalle del viaje

Al seleccionar un viaje (botón **Ver detalle**), el panel derecho muestra 5 pestañas:

#### Pestaña: Estado y mapa
- Cambiar el estado del viaje
- Actualizar la última ubicación registrada
- Actualizar la búsqueda del mapa (Google Maps se actualiza en tiempo real)
- Agregar un comentario al cambio de estado
- Pulsar **Actualizar estado y ubicación**
- Ver el historial completo de cambios de estado

**Estados disponibles:**
| Estado | Significado |
|---|---|
| Por planear | Viaje pendiente de organizar |
| En organización | Se están gestionando vuelos, hotel, etc. |
| Reservado | Vuelos y hotel confirmados |
| En curso | El viajero está actualmente de viaje |
| Reprogramado | Fechas o condiciones cambiaron |
| Finalizado | Viaje completado |

#### Pestaña: Itinerario
- Agregar actividades con fecha, hora, lugar, categoría y descripción
- **Categorías:** Cultura · Comida · Aventura · Descanso · Transporte · Fotografía
- Editar o eliminar actividades individuales
- Cada actividad tiene un enlace directo a Google Maps

#### Pestaña: Presupuesto
- Ingresar montos por categoría: Transporte · Hospedaje · Comida · Actividades
- El total se calcula y muestra automáticamente
- Pulsar **Guardar presupuesto**

#### Pestaña: Notas
- Campo de texto libre para notas internas del administrador
- Recomendaciones, recordatorios, información del cliente
- Pulsar **Guardar notas**

#### Pestaña: Destinos
- Agregar destinos recomendados globales (no vinculados a un viaje específico)
- Cada destino tiene: nombre, imagen, valoración, descripción y enlace al mapa
- Estos destinos aparecen en el panel de usuario

---

## 4. Gestión de formularios

### 4.1 Contactos

Muestra todas las solicitudes enviadas desde el formulario de contacto de la landing.

**Información por solicitud:**
- Nombre y correo del solicitante
- Destino seleccionado
- Mensaje completo
- Estado actual
- Administrador que lo está gestionando

**Acciones disponibles:**

| Botón | Acción |
|---|---|
| ↗ Responder por correo | Abre el cliente de correo con el email del solicitante |
| **Pendiente** | Resetea el estado a pendiente |
| **En gestión** | Marca como en proceso y registra el nombre del admin |
| **Gestionado** | Marca como completado y registra el nombre del admin |
| **Guardar nota** | Guarda la nota interna del campo de texto |
| **Eliminar** | Elimina la solicitud (requiere confirmación) |

Cuando un contacto pasa a "En gestión" o "Gestionado", aparece en el card: *"Gestionado por: Nombre del Admin"*.

### 4.2 Comunidad (newsletter)

Muestra correos suscritos al newsletter desde la landing.

**Acciones disponibles:**

| Botón | Acción |
|---|---|
| ↗ Escribir al suscriptor | Abre el cliente de correo |
| **Activa** | Marca la suscripción como activa |
| **Archivar** | Archiva la suscripción |
| **Eliminar** | Elimina el registro |

---

## 5. Chat widget de gestión rápida

El botón azul flotante en la esquina inferior derecha abre el chat de gestión.

### Acciones rápidas (chips)

| Chip | Acción |
|---|---|
| **+ Plantilla** | Inserta el formato estructurado en el campo de texto |
| **Formularios** | Navega directamente a la sección de contactos |
| **Cambiar estado** | Muestra instrucciones para actualizar el estado de un viaje |

### Flujo de uso

1. Copiar el mensaje de un cliente (WhatsApp, email, nota de voz transcrita)
2. Pegar en el campo del chat (Ctrl+V)
3. Pulsar **Enviar** o **Ctrl+Enter**
4. El chat muestra los datos que detectó
5. El formulario de registro se rellena automáticamente
6. El chat hace scroll al formulario para que el admin pueda revisar y guardar

### Formato compatible
El parser entiende fechas en estos formatos:
- `15/06/2026` o `15-06-2026`
- `2026-06-15` (ISO)
- `15 de junio de 2026`

Y extrae automáticamente: correos, número de viajeros (con palabras como "viajeros", "personas", "pax"), tipo de experiencia y estado del viaje.

---

## 6. Exportar datos

Botón **Exportar datos** en el header del dashboard.

Genera un archivo `wayture-datos-FECHA.json` con toda la información de:
- Viajes
- Destinos recomendados
- Contactos
- Suscripciones

---

## 7. Cerrar sesión

Botón **Cerrar sesión** en el header del dashboard o en el menú de usuario. Se eliminan los listeners de Firestore antes de cerrar la sesión para evitar errores de permisos.

---

## 8. Preguntas frecuentes

**¿Por qué no veo el panel al entrar?**
La cuenta no tiene rol `admin`. Verificar en Firestore Console → colección `usuarios` → documento del usuario → campo `rol`.

**¿Cómo asignar rol admin a una cuenta?**
En Firebase Console → Firestore → colección `usuarios` → seleccionar el documento del usuario → editar campo `rol` y escribir `admin`.

**¿Los cambios que hace otro admin se ven en tiempo real?**
Sí. El panel usa `onSnapshot` de Firestore. Cualquier cambio hecho desde otra pestaña o dispositivo aparece automáticamente en la lista de viajes, métricas y contactos.

**¿Qué pasa si el correo del viajero no está registrado?**
El viaje se crea igualmente. El correo queda como referencia y aparece una advertencia. El viajero no podrá ver el viaje desde su panel hasta que se registre con ese correo.

**¿Puedo usar el mismo código en otro viaje?**
No. El sistema garantiza que cada código es único en Firestore antes de guardarlo.
