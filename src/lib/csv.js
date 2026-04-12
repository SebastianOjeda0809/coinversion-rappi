// CSV builders extraídos de index.html líneas 58-139 (duplicados para tests).
// NO modificar index.html.

import { getCC } from "./helpers.js";

export function makeCSV(reqs) {
  const h =
    "country,brand_id,level_1,level_2,level_3,level_4,level_5,level_6,level_7,level_8,level_9,level_10,level_11,level_12,action";
  const rows = [h];
  reqs.forEach((r) => {
    if (r.palanca === "porcentaje") {
      const c = getCC(r.pais),
        b = (r.brandId || "").replace(/\D/g, "");
      if (c && b)
        rows.push(
          [
            c,
            b,
            parseInt(r.porcentaje) || 0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            "UPDATE",
          ].join(","),
        );
    }
  });
  return rows;
}

export function makeDescuentoCSVs(reqs) {
  const HDR =
    "country,brand_id,level_1,level_2,level_3,level_4,level_5,level_6,level_7,level_8,level_9,level_10,level_11,level_12,action";
  const items = reqs.filter((r) => r.palanca === "porcentaje");
  if (items.length === 0) return [];
  const files = [];
  let i = 0;
  while (i < items.length) {
    const chunk = items.slice(i, i + 20);
    const rows = [HDR];
    chunk.forEach((r) => {
      const c = getCC(r.pais),
        b = (r.brandId || "").replace(/\D/g, "");
      if (c && b)
        rows.push(
          [
            c,
            b,
            parseInt(r.porcentaje) || 0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            "UPDATE",
          ].join(","),
        );
    });
    if (rows.length > 1) files.push(rows.join("\n"));
    i += 20;
  }
  return files;
}

export function makeFTCSVs(reqs) {
  const HDR = "country,brand_id,franchise_id,strategy,action";
  const items = reqs.filter((r) => r.palanca === "free_trial");
  if (items.length === 0) return [];
  const files = [];
  let i = 0;
  while (i < items.length) {
    const chunk = items.slice(i, i + 20);
    const rows = [HDR];
    chunk.forEach((r) => {
      const c = getCC(r.pais),
        b = (r.brandId || "").replace(/\D/g, "");
      const strategy =
        parseInt(r.semanas) === 1 ? "co_invest_rxa_1_3" : "co_invest_rxa_2_2";
      if (c && b) rows.push([c, b, "-", strategy, "update"].join(","));
    });
    if (rows.length > 1) files.push(rows.join("\n"));
    i += 20;
  }
  return files;
}

export function makeHistoricoCSV(reqs, desde, hasta) {
  const HDR =
    "country,farmer,lider,palanca,tipo_gestion,detalle,fecha_aprobacion";
  const rows = [HDR];
  let aprobadas = reqs.filter((r) => r.status === "approved" && r.reviewedAt);
  if (desde)
    aprobadas = aprobadas.filter((r) => r.reviewedAt.slice(0, 10) >= desde);
  if (hasta)
    aprobadas = aprobadas.filter((r) => r.reviewedAt.slice(0, 10) <= hasta);
  aprobadas.sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));
  aprobadas.forEach((r) => {
    const c = getCC(r.pais);
    const detalle =
      r.palanca === "porcentaje"
        ? r.porcentaje + "% descuento"
        : r.semanas + " semana(s) gratis";
    rows.push(
      [
        c,
        r.farmer || "",
        r.lider || "",
        r.palanca === "porcentaje" ? "Porcentaje" : "Free Trial",
        r.tipoGestion || r.tipo || "",
        detalle,
        (r.reviewedAt || "").slice(0, 10),
      ].join(","),
    );
  });
  return { csv: rows.join("\n"), count: aprobadas.length };
}
