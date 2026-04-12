// validate() extraído de index.html línea 144-153 (duplicado para tests).
// NO modificar index.html.

import { fN, mA, mL } from "./helpers.js";

export function validate(req, all) {
  const errA = [],
    errB = [],
    errC = [],
    infos = [];
  const mto = parseFloat(req.montoCampana) || 0,
    pct = parseInt(req.porcentaje) || 0;
  const hist = all.filter(
    (r) => r.brandId === req.brandId && r.status !== "rejected",
  );

  if (req.fechaInicio) {
    const mR = mA(req.fechaInicio);
    const dup = hist.find((r) => r.fechaInicio && mA(r.fechaInicio) === mR);
    if (dup)
      errA.push({
        t: "Duplicado en el mismo mes",
        d: `La marca ${req.brandId} ya tiene co-inversión en ${mL(req.fechaInicio)} (${
          dup.palanca === "free_trial"
            ? "FT " + dup.semanas + "s"
            : dup.porcentaje + "% · " + fN(dup.montoCampana)
        }). No se permite otra en el mismo mes.`,
      });
  }

  if (req.palanca === "free_trial") {
    const ft = hist.find((r) => r.palanca === "free_trial");
    if (ft)
      errA.push({
        t: "Free Trial ya utilizado",
        d: `La marca ${req.brandId} ya recibió su Free Trial.`,
      });
    const s = parseInt(req.semanas);
    if (!s || s < 1 || s > 2)
      errA.push({
        t: "Semanas inválidas",
        d: "El Free Trial debe ser de 1 o 2 semanas.",
      });
  }

  if (req.palanca === "porcentaje" && req.fechaInicio) {
    const hp = hist
      .filter((r) => r.palanca === "porcentaje" && r.fechaInicio)
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    if (hp.length > 0) {
      const l = hp[0],
        ma = parseFloat(l.montoCampana) || 0,
        pa = parseInt(l.porcentaje) || 0;
      if (mto < ma) {
        if (pct > pa)
          errC.push({
            t: "Monto baja y % sube — inválido",
            d: `Tuvo ${fN(ma)} al ${pa}% en ${mL(l.fechaInicio)}. El nuevo monto (${fN(mto)}) es MENOR y el % SUBE a ${pct}%. No permitido.`,
          });
        else
          errB.push({
            t: "Monto inferior al histórico",
            d: `Tuvo ${fN(ma)} al ${pa}% en ${mL(l.fechaInicio)}. El nuevo monto (${fN(mto)}) es MENOR. Debe crecer.`,
          });
      } else if (mto === ma)
        errB.push({
          t: "Mismo monto",
          d: `Ya tuvo exactamente ${fN(ma)} al ${pa}%. Debe ser mayor.`,
        });
      else {
        infos.push(`✓ Monto sube: ${fN(ma)} → ${fN(mto)}`);
        if (pct < pa)
          infos.push(`% baja ${pa}% → ${pct}% (permitido, monto creció).`);
      }
    } else infos.push(`Primera co-inversión de ${req.brandId}.`);
  }

  const tipo =
    hist.filter((r) => r.palanca === "porcentaje").length > 0
      ? "upselling"
      : "adquisicion";
  return {
    errA,
    errB,
    errC,
    allErrors: [...errA, ...errB, ...errC],
    infos,
    tipo,
  };
}
