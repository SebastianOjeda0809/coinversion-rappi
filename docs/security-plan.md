# Plan de Migración de Seguridad — SPA Co-Inversión Rappi LATAM

**Fecha:** 2026-04-11
**Alcance:** `index.html` (SPA vanilla JS) + backend Google Apps Script + deploy GitHub Pages
**Audiencia:** ~20 supervisores, ~80 farmers LATAM

---

## 1. Threat Model (STRIDE abreviado)

| Categoría           | Amenaza relevante                             | Vector actual                                 |
| ------------------- | --------------------------------------------- | --------------------------------------------- |
| **S**poofing        | Farmer/externo se hace pasar por supervisor   | PINs hardcodeados en JS visibles en devtools  |
| **T**ampering       | Modificación de aprobaciones/montos en Sheets | URL del Apps Script pública + `Anyone` access |
| **R**epudiation     | Supervisor niega haber aprobado               | Sin audit log con identidad verificada        |
| **I**nfo Disclosure | Lista completa de PINs expuesta en bundle     | Variable `SUP_PINS` en cliente                |
| **D**oS             | Spam de escrituras al Sheet                   | Endpoint abierto sin rate limit ni auth       |
| **E**oP             | Farmer ejecuta acciones de supervisor         | Bypass trivial del gate de PIN vía consola    |

**Activos críticos:** integridad del Sheet de co-inversión, trazabilidad de decisiones, confidencialidad de montos negociados.

**Actores:** (1) farmer legítimo, (2) supervisor legítimo, (3) empleado Rappi curioso con acceso a la URL pública, (4) externo que encuentre la URL de GitHub Pages / Apps Script.

---

## 2. Hallazgos y Prioridad

| ID  | Hallazgo                                                                        | Severidad | Prioridad |
| --- | ------------------------------------------------------------------------------- | --------- | --------- |
| F1  | `SUP_PINS` hardcodeado (línea 33) — bypass trivial                              | Crítica   | **P0**    |
| F2  | Apps Script Web App con acceso `Anyone` — cualquiera escribe                    | Crítica   | **P0**    |
| F3  | Validación solo en cliente — backend confía ciegamente                          | Alta      | **P0**    |
| F4  | Sin audit log con identidad del actor                                           | Alta      | **P1**    |
| F5  | `mode:"no-cors"` oculta errores de escritura                                    | Media     | **P1**    |
| F6  | `APPS_SCRIPT_URL` hardcodeado (línea 32) — no es secreto pero facilita scraping | Baja      | **P2**    |
| F7  | SPA monolítica 720KB sin CSP ni SRI                                             | Media     | **P2**    |

**Definición:** P0 = fix en ≤1 semana; P1 = ≤3 semanas; P2 = backlog trimestral.

---

## 3. Remediación Inmediata (Quick Wins <1h)

Ejecutables **hoy**, sin refactor:

1. **Rotar todos los PINs** del archivo `apps-script-actual.txt` (los actuales ya están comprometidos por estar en el repo público). Comunicarlos por canal privado (1Password, Slack DM).
2. **Restringir el Apps Script Web App**: redeploy con `Execute as: Me` y `Who has access: Anyone with Google account` (no `Anyone`). Reduce superficie de `Internet` a `cualquiera con cuenta Google` — aún no es suficiente pero corta bots anónimos.
3. **Añadir validación mínima en Apps Script `doPost`**: rechazar payloads sin campos obligatorios, con montos negativos, o con `action` desconocido. Bloquea el 80% de tampering accidental.
4. **Quitar `mode:"no-cors"`** y loggear `response.ok` en cliente — expone errores que hoy son silenciosos. Requiere habilitar CORS en Apps Script (`ContentService` devuelve JSON con headers por defecto).
5. **Revocar y regenerar** la URL del Web App (nuevo deployment ID) — invalida scrapers existentes.
6. **Añadir Git pre-commit hook / `.gitignore` audit** para asegurar que `apps-script-actual.txt` y variantes no lleguen al repo.

---

## 4. Plan de Migración por Fases

Cada fase ≤1 semana, sin downtime (feature-flag o doble-escritura donde aplique).

### Fase 0 — Baseline (día 0-2)

- Aplicar los 6 quick wins anteriores.
- Crear proyecto GCP asociado al Apps Script para obtener `OAuth Client ID`.
- Crear Sheet `AuditLog` con columnas: `timestamp, email, action, payload_hash, ip_hint, result`.

### Fase 1 — Autenticación con Google Identity (día 3-7)

**Objetivo:** eliminar `SUP_PINS`. Sustituir por login Google corporativo (`@rappi.com`).

- Cliente: integrar Google Identity Services (GIS) — botón "Sign in with Google", obtiene `id_token` (JWT).
- Backend: Apps Script valida el `id_token` contra `https://oauth2.googleapis.com/tokeninfo` y verifica `email_verified`, `aud` y `hd === "rappi.com"`.
- Rol (`supervisor` / `farmer`) se resuelve contra una hoja `Roles` (columna email → rol), **no** contra un PIN.

**Snippets ilustrativos:**

Cliente (reemplaza el gate de PIN):

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
<div
  id="g_id_onload"
  data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
  data-callback="onGoogleSignIn"
  data-hd="rappi.com"
></div>
<div class="g_id_signin" data-type="standard"></div>
<script>
  let ID_TOKEN = null;
  function onGoogleSignIn(resp) {
    ID_TOKEN = resp.credential; // JWT
    bootAppWithToken(ID_TOKEN);
  }
  async function apiPost(action, payload) {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight
      body: JSON.stringify({ idToken: ID_TOKEN, action, payload }),
    });
    if (!r.ok) throw new Error("API " + r.status);
    return r.json();
  }
</script>
```

Backend (Apps Script `Code.gs`):

```javascript
const ALLOWED_HD = "rappi.com";
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";

function doPost(e) {
  try {
    const { idToken, action, payload } = JSON.parse(e.postData.contents);
    const claims = verifyIdToken_(idToken);
    const role = resolveRole_(claims.email); // lookup en hoja Roles
    assertAuthorized_(role, action);
    validatePayload_(action, payload); // replica de validate() cliente
    const result = dispatch_(action, payload, claims);
    audit_(claims.email, action, payload, "ok");
    return json_({ ok: true, result });
  } catch (err) {
    audit_("-", "error", { msg: String(err) }, "fail");
    return json_({ ok: false, error: String(err) });
  }
}

function verifyIdToken_(idToken) {
  if (!idToken) throw new Error("missing token");
  const url =
    "https://oauth2.googleapis.com/tokeninfo?id_token=" +
    encodeURIComponent(idToken);
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error("invalid token");
  const c = JSON.parse(resp.getContentText());
  if (c.aud !== CLIENT_ID) throw new Error("bad audience");
  if (c.hd !== ALLOWED_HD) throw new Error("bad domain");
  if (c.email_verified !== "true" && c.email_verified !== true)
    throw new Error("email not verified");
  if (Number(c.exp) * 1000 < Date.now()) throw new Error("expired");
  return c;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

**Nota sobre `Session.getActiveUser()`:** solo funciona si el Web App se despliega como `Execute as: User accessing the web app` y el dominio coincide. Es más simple pero pierde `hd` y obliga a que cada request incluya credenciales del navegador. **Recomendado: verificar ID token manualmente** (mayor control, funciona cross-origin desde GitHub Pages).

### Fase 2 — Validación servidor + respuestas estructuradas (día 8-12)

- Portar `validate()` del cliente a `validatePayload_()` en Apps Script (schema por `action`: tipos, rangos de monto, enums de país, regex de IDs).
- Eliminar `mode:"no-cors"` en cliente. Leer `{ok, error}` y mostrar toast de éxito/fallo real.
- Añadir idempotency key (`clientReqId` UUID) para evitar duplicados por reintentos.

### Fase 3 — Autorización por rol + audit log (día 13-19)

- Matriz `rol × action` en `Code.gs`: `farmer` puede `create_request`; `supervisor` puede `approve|reject`; nadie puede `delete` desde la UI.
- `audit_()` escribe cada intento (éxito o fallo) en hoja `AuditLog` con `SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AuditLog").appendRow([...])`.
- Hash del payload con `Utilities.computeDigest(SHA_256, ...)` para detectar tampering posterior.

### Fase 4 — Defensa en profundidad (día 20-26)

- **CSP** en `index.html`:
  `default-src 'self'; script-src 'self' https://accounts.google.com; connect-src https://script.google.com https://*.googleusercontent.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'`.
- **SRI** en cualquier `<script src>` externo.
- **Rate limit** en Apps Script: `CacheService` con clave `email` → contador 60 req/min, 429 si se excede.
- Rotación automática de `deploymentId` cada 90 días (documentado en runbook).

### Fase 5 — Opcional, si crece el equipo >200 (mes 2+)

- Migrar backend de Apps Script a Cloud Run + Firestore, manteniendo Sheet como read-replica.
- Login SSO corporativo (Okta/Google Workspace con grupos).
- SIEM: exportar `AuditLog` a BigQuery + alertas.

---

## 5. Criterios de Aceptación por Fase

| Fase | Criterio verificable                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 0    | `grep -r "SUP_PINS" index.html` → aún existe pero PINs rotados; Web App no acepta requests anónimos      |
| 1    | Abrir devtools, borrar `ID_TOKEN`, intentar POST → backend responde `{ok:false, error:"invalid token"}`  |
| 2    | `validatePayload_()` rechaza monto negativo enviado vía `curl` directo al endpoint                       |
| 3    | Hoja `AuditLog` registra toda aprobación/rechazo con email verificado; farmer no puede invocar `approve` |
| 4    | `curl -X POST` 100 veces en 1 min → 429 tras umbral; CSP reporta violaciones en consola                  |

---

## 6. Riesgos y Mitigaciones del Plan

- **Riesgo:** usuarios sin cuenta `@rappi.com` (contratistas). **Mitigación:** whitelist explícita en hoja `Roles` con emails externos permitidos, validar `email` en lugar de solo `hd`.
- **Riesgo:** Apps Script `UrlFetchApp` a `tokeninfo` añade ~200ms por request. **Mitigación:** cachear `{idToken → claims}` en `CacheService` hasta `exp` (máx 1h).
- **Riesgo:** GitHub Pages público expone la SPA. **Mitigación aceptada:** el código cliente no es secreto; lo secreto es la autorización backend, que ahora es robusta.
- **Riesgo:** migración rompe flujo actual. **Mitigación:** feature flag `USE_GOOGLE_AUTH` en cliente, doble soporte por 1 semana, sunset del PIN tras validar métricas.

---

## 7. Runbook Post-Migración (resumen)

- Onboarding supervisor: añadir fila en hoja `Roles` (`email, rol=supervisor, país`).
- Offboarding: eliminar fila — el siguiente request de ese email devolverá `403`.
- Incidente: revisar `AuditLog` filtrando por `email` o `timestamp`; revocar deployment si hay compromiso.
- Rotación: cambiar `CLIENT_ID` solo si se sospecha leak del proyecto GCP (raro).

---

**Estimación total:** 4 semanas calendario para P0+P1; Fase 4 en paralelo. Esfuerzo ~1 FTE senior o 2 mid-level.
