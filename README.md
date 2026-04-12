# Co-Inversión Rappi

SPA de gestión de solicitudes de co-inversión para Rappi (descuentos por porcentaje y free trial). Implementada como **un único `index.html`** con vanilla JS (~720 KB, sin bundler, sin framework). El estado se persiste en `localStorage` y se sincroniza con una hoja de cálculo vía Google Apps Script (`APPS_SCRIPT_URL`).

Funciona completamente offline una vez cargada; las acciones de guardado intentan sincronizar remoto con un merge por `id` (local gana ante conflicto).

## Estructura

```
index.html              # App entera (producción)
src/lib/                # Copias de funciones puras, sólo para tests
  helpers.js            # CC, fN, mA, mL, getCC
  csv.js                # makeCSV, makeDescuentoCSVs, makeFTCSVs, makeHistoricoCSV
  validate.js           # validate(req, all)
  mergeReqs.js          # mergeReqsById(remote, local)
tests/                  # Suites Vitest
.github/workflows/      # CI: lint HTML/JS + Vitest
apps-script-*.txt       # Backend Google Apps Script (referencia, no se commitea)
```

> Las funciones en `src/lib/` están **duplicadas** desde `index.html` para permitir tests aislados. La fuente canónica sigue siendo `index.html` hasta que se haga la migración completa.

## Desarrollo local

Requisitos: Node 20.x.

```bash
npm install
npm test              # modo watch
npm run test:run      # una sola corrida (CI mode)
```

Para abrir la app: basta con abrir `index.html` en el navegador (doble click o `open index.html`). No requiere build.

## CI

`.github/workflows/validate.yml` se dispara en push a `main` y en PRs. Corre dos jobs:

- **lint**: verifica que `index.html` contenga las etiquetas mínimas y que cada bloque `<script>` inline parsee con `node --check`.
- **test**: ejecuta Vitest con `happy-dom`.

## Deploy (GitHub Pages)

El sitio está publicado vía GitHub Pages sobre la rama `main`. Para (re)activar:

1. GitHub → Settings → Pages.
2. Source: **Deploy from a branch**.
3. Branch: `main` / `/ (root)`.
4. Guardar. La URL queda disponible en unos minutos en `https://<owner>.github.io/coinversion-rappi/`.

Como toda la app es un único HTML estático, cualquier merge a `main` queda automáticamente deployado.
