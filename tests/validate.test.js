import { describe, it, expect } from "vitest";
import { validate } from "../src/lib/validate.js";

describe("validate()", () => {
  it("happy path: primera co-inversión porcentaje, sin errores", () => {
    const req = {
      brandId: "B123",
      palanca: "porcentaje",
      porcentaje: "20",
      montoCampana: "1000000",
      fechaInicio: "2026-04-01",
    };
    const res = validate(req, []);
    expect(res.allErrors).toHaveLength(0);
    expect(res.tipo).toBe("adquisicion");
    expect(res.infos.some((i) => i.includes("Primera co-inversión"))).toBe(
      true,
    );
  });

  it("edge: segunda co-inversión porcentaje con monto creciente marca tipo upselling", () => {
    const hist = [
      {
        brandId: "B1",
        palanca: "porcentaje",
        porcentaje: "10",
        montoCampana: "500000",
        fechaInicio: "2026-01-15",
        status: "approved",
      },
    ];
    const req = {
      brandId: "B1",
      palanca: "porcentaje",
      porcentaje: "15",
      montoCampana: "1000000",
      fechaInicio: "2026-03-01",
    };
    const res = validate(req, hist);
    expect(res.tipo).toBe("upselling");
    expect(res.allErrors).toHaveLength(0);
    expect(res.infos.some((i) => i.includes("Monto sube"))).toBe(true);
  });

  it("error: duplicado en el mismo mes", () => {
    const hist = [
      {
        brandId: "B1",
        palanca: "porcentaje",
        porcentaje: "10",
        montoCampana: "500000",
        fechaInicio: "2026-04-05",
        status: "pending",
      },
    ];
    const req = {
      brandId: "B1",
      palanca: "porcentaje",
      porcentaje: "15",
      montoCampana: "2000000",
      fechaInicio: "2026-04-20",
    };
    const res = validate(req, hist);
    expect(res.errA.length).toBeGreaterThan(0);
    expect(res.errA[0].t).toBe("Duplicado en el mismo mes");
  });

  it("error: free trial ya utilizado", () => {
    const hist = [
      {
        brandId: "B1",
        palanca: "free_trial",
        semanas: 2,
        fechaInicio: "2026-01-01",
        status: "approved",
      },
    ];
    const req = {
      brandId: "B1",
      palanca: "free_trial",
      semanas: "1",
      fechaInicio: "2026-05-01",
    };
    const res = validate(req, hist);
    expect(res.errA.some((e) => e.t === "Free Trial ya utilizado")).toBe(true);
  });

  it("error: semanas inválidas en free trial", () => {
    const req = {
      brandId: "B9",
      palanca: "free_trial",
      semanas: "5",
      fechaInicio: "2026-04-01",
    };
    const res = validate(req, []);
    expect(res.errA.some((e) => e.t === "Semanas inválidas")).toBe(true);
  });

  it("errC: monto baja y porcentaje sube (inválido)", () => {
    const hist = [
      {
        brandId: "B1",
        palanca: "porcentaje",
        porcentaje: "10",
        montoCampana: "1000000",
        fechaInicio: "2026-01-10",
        status: "approved",
      },
    ];
    const req = {
      brandId: "B1",
      palanca: "porcentaje",
      porcentaje: "20",
      montoCampana: "500000",
      fechaInicio: "2026-03-10",
    };
    const res = validate(req, hist);
    expect(res.errC.some((e) => e.t.startsWith("Monto baja y % sube"))).toBe(
      true,
    );
  });

  it("ignora requests rejected en histórico", () => {
    const hist = [
      {
        brandId: "B1",
        palanca: "porcentaje",
        porcentaje: "10",
        montoCampana: "500000",
        fechaInicio: "2026-04-01",
        status: "rejected",
      },
    ];
    const req = {
      brandId: "B1",
      palanca: "porcentaje",
      porcentaje: "15",
      montoCampana: "1000000",
      fechaInicio: "2026-04-20",
    };
    const res = validate(req, hist);
    expect(res.allErrors).toHaveLength(0);
    expect(res.tipo).toBe("adquisicion");
  });
});
