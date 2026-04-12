// Helpers puros extraídos de index.html (duplicados para tests).
// NO modificar index.html: este archivo existe para testing aislado.

export const CC = {
  COLOMBIA: "CO",
  MEXICO: "MX",
  MÉXICO: "MX",
  ARGENTINA: "AR",
  PERU: "PE",
  PERÚ: "PE",
  ECUADOR: "EC",
  URUGUAY: "UY",
  CHILE: "CL",
  "COSTA RICA": "CR",
};

export const fN = (n) => (n || 0).toLocaleString("es-CO");

export const mA = (d) => {
  const t = new Date(d + "T12:00:00");
  return t.getFullYear() + "-" + t.getMonth();
};

export const mL = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

export const getCC = (p) => {
  const k = (p || "").toUpperCase().trim();
  return CC[k] || k.substring(0, 2);
};
