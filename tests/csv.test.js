import { describe, it, expect } from "vitest";
import {
  makeCSV,
  makeDescuentoCSVs,
  makeFTCSVs,
  makeHistoricoCSV,
} from "../src/lib/csv.js";

describe("makeCSV()", () => {
  it("happy path: genera header + fila por cada porcentaje válido", () => {
    const reqs = [
      {
        palanca: "porcentaje",
        pais: "COLOMBIA",
        brandId: "B123",
        porcentaje: "15",
      },
      {
        palanca: "porcentaje",
        pais: "MEXICO",
        brandId: "999abc",
        porcentaje: "20",
      },
    ];
    const rows = makeCSV(reqs);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("country,brand_id,level_1");
    expect(rows[1].startsWith("CO,123,15,")).toBe(true);
    expect(rows[2].startsWith("MX,999,20,")).toBe(true);
  });

  it("edge: ignora items con palanca distinta a porcentaje", () => {
    const reqs = [
      { palanca: "free_trial", pais: "COLOMBIA", brandId: "B1", semanas: 2 },
      {
        palanca: "porcentaje",
        pais: "COLOMBIA",
        brandId: "B2",
        porcentaje: "10",
      },
    ];
    const rows = makeCSV(reqs);
    expect(rows).toHaveLength(2);
  });

  it("error/borde: entrada vacía devuelve solo header", () => {
    expect(makeCSV([])).toHaveLength(1);
  });

  it("error: brandId sin dígitos no genera fila", () => {
    const reqs = [
      {
        palanca: "porcentaje",
        pais: "COLOMBIA",
        brandId: "abc",
        porcentaje: "10",
      },
    ];
    expect(makeCSV(reqs)).toHaveLength(1);
  });
});

describe("makeDescuentoCSVs()", () => {
  it("happy path: un archivo con header para menos de 20 items", () => {
    const reqs = [
      {
        palanca: "porcentaje",
        pais: "COLOMBIA",
        brandId: "B1",
        porcentaje: "10",
      },
    ];
    const files = makeDescuentoCSVs(reqs);
    expect(files).toHaveLength(1);
    expect(files[0].split("\n")).toHaveLength(2);
  });

  it("edge: chunkea en archivos de 20 items", () => {
    const reqs = Array.from({ length: 45 }, (_, i) => ({
      palanca: "porcentaje",
      pais: "COLOMBIA",
      brandId: "B" + i,
      porcentaje: "10",
    }));
    const files = makeDescuentoCSVs(reqs);
    expect(files).toHaveLength(3);
    expect(files[0].split("\n").length).toBe(21);
    expect(files[2].split("\n").length).toBe(6);
  });

  it("error/borde: sin porcentajes devuelve array vacío", () => {
    expect(makeDescuentoCSVs([])).toEqual([]);
    expect(
      makeDescuentoCSVs([
        { palanca: "free_trial", pais: "CO", brandId: "B1", semanas: 1 },
      ]),
    ).toEqual([]);
  });
});

describe("makeFTCSVs()", () => {
  it("happy path: semanas=1 → co_invest_rxa_1_3", () => {
    const reqs = [
      { palanca: "free_trial", pais: "COLOMBIA", brandId: "B1", semanas: "1" },
    ];
    const files = makeFTCSVs(reqs);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("co_invest_rxa_1_3");
  });

  it("edge: semanas=2 → co_invest_rxa_2_2", () => {
    const reqs = [
      { palanca: "free_trial", pais: "MEXICO", brandId: "B7", semanas: "2" },
    ];
    const files = makeFTCSVs(reqs);
    expect(files[0]).toContain("co_invest_rxa_2_2");
    expect(files[0]).toContain("MX,7,");
  });

  it("error/borde: sin free_trial retorna []", () => {
    expect(makeFTCSVs([])).toEqual([]);
    expect(
      makeFTCSVs([
        { palanca: "porcentaje", pais: "CO", brandId: "B1", porcentaje: "10" },
      ]),
    ).toEqual([]);
  });
});

describe("makeHistoricoCSV()", () => {
  const base = [
    {
      status: "approved",
      reviewedAt: "2026-03-15T10:00:00Z",
      pais: "COLOMBIA",
      farmer: "Ana",
      lider: "Luis",
      palanca: "porcentaje",
      porcentaje: 15,
      tipoGestion: "upselling",
    },
    {
      status: "approved",
      reviewedAt: "2026-04-05T12:00:00Z",
      pais: "MEXICO",
      farmer: "Juan",
      lider: "Sofia",
      palanca: "free_trial",
      semanas: 2,
      tipo: "adquisicion",
    },
    {
      status: "rejected",
      reviewedAt: "2026-04-01T09:00:00Z",
      pais: "CHILE",
      palanca: "porcentaje",
      porcentaje: 5,
    },
    {
      status: "pending",
      reviewedAt: "2026-04-01T09:00:00Z",
      pais: "CHILE",
      palanca: "porcentaje",
      porcentaje: 5,
    },
  ];

  it("happy path: incluye solo approved con reviewedAt, ordenados desc", () => {
    const { csv, count } = makeHistoricoCSV(base, "", "");
    expect(count).toBe(2);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("country,farmer,lider,palanca");
    expect(lines[1]).toContain("MX,Juan");
    expect(lines[2]).toContain("CO,Ana");
  });

  it("edge: filtra por rango desde/hasta", () => {
    const { count } = makeHistoricoCSV(base, "2026-04-01", "2026-04-30");
    expect(count).toBe(1);
  });

  it("error/borde: sin aprobadas devuelve count=0 y solo header", () => {
    const { csv, count } = makeHistoricoCSV([], "", "");
    expect(count).toBe(0);
    expect(csv.split("\n")).toHaveLength(1);
  });
});
