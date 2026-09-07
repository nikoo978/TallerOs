import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the TallerOS application shell and install metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const application = await readFile(new URL("../app/workshop-app.tsx", import.meta.url), "utf8");

  assert.match(layout, /TallerOS — Gestión para técnicos/i);
  assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest["']/i);
  assert.match(layout, /themeColor:\s*["']#10192d["']/i);
  assert.match(application, /TALLER/i);
  assert.match(application, /Buen día/i);
  assert.match(application, /Nueva orden/i);
  assert.doesNotMatch(application, /codex-preview|Your site is taking shape|SkeletonPreview/i);
});

test("ships an installable offline-capable manifest and service worker", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.equal(manifest.name, "TallerOS — Gestión técnica");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.match(worker, /serviceWorker|addEventListener\("fetch"/);
  assert.match(worker, /networkFirstNavigation/);
  assert.match(worker, /cacheFirstStatic/);
  assert.match(worker, /discoverExecutableShell/);
  assert.match(worker, /shellCache\.match\(request\)/);
});

test("includes a complete budget workflow and recurring repair templates", async () => {
  const application = await readFile(new URL("../app/workshop-app.tsx", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../app/repair-catalog.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(application, /Presupuestos/);
  assert.match(application, /itemsJson/);
  assert.match(application, /Recargo/);
  assert.match(application, /Descuento/);
  assert.match(application, /No pudimos crearla todavía/);
  assert.match(application, /onInvalidCapture/);
  assert.match(application, /BudgetPrintDocument/);
  assert.match(application, /WorkOrderPrintDocument/);
  assert.match(catalog, /Cambio de pantalla/);
  assert.match(catalog, /Instalación de Windows/);
  assert.match(catalog, /Upgrade a SSD/);
  assert.ok((catalog.match(/category:/g) || []).length >= 12);
  assert.match(styles, /\.quick-template-grid/);
  assert.match(styles, /\.document-items/);
});

test("persists the workspace redundantly and downloads real PDF files", async () => {
  const application = await readFile(new URL("../app/workshop-app.tsx", import.meta.url), "utf8");
  const storage = await readFile(new URL("../app/workspace-storage.ts", import.meta.url), "utf8");
  const pdf = await readFile(new URL("../app/pdf-generator.ts", import.meta.url), "utf8");

  assert.match(application, /Guardando…/);
  assert.match(application, /PDF presupuesto/);
  assert.match(application, /PDF orden/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /localStorage\.setItem/);
  assert.match(storage, /talleros:workspace:v3/);
  assert.match(application, /INITIAL_ORDERS: RepairOrder\[\] = \[\]/);
  assert.doesNotMatch(application, /Martina Ríos|Diego Ortiz|Lucía Pérez/);
  assert.match(storage, /saveWorkspace/);
  assert.match(pdf, /new jsPDF/);
  assert.match(pdf, /autoTable/);
  assert.match(pdf, /doc\.save\(filename\)/);
});
