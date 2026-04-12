import { describe, it, expect } from "vitest";
import { mergeReqsById } from "../src/lib/mergeReqs.js";

describe("mergeReqsById()", () => {
  it("happy path: merge por id, local sobrescribe remoto", () => {
    const remote = [
      { id: "A", status: "pending", val: 1 },
      { id: "B", status: "pending", val: 1 },
    ];
    const local = [
      { id: "B", status: "approved", val: 2 },
      { id: "C", status: "pending", val: 3 },
    ];
    const merged = mergeReqsById(remote, local);
    expect(merged).toHaveLength(3);
    const byId = Object.fromEntries(merged.map((x) => [x.id, x]));
    expect(byId.A.val).toBe(1);
    expect(byId.B.status).toBe("approved");
    expect(byId.B.val).toBe(2);
    expect(byId.C.val).toBe(3);
  });

  it("edge: remoto vacío devuelve items locales únicos", () => {
    const local = [
      { id: "X", v: 1 },
      { id: "Y", v: 2 },
      { id: "X", v: 99 }, // duplicado local → último gana
    ];
    const merged = mergeReqsById([], local);
    expect(merged).toHaveLength(2);
    expect(merged.find((x) => x.id === "X").v).toBe(99);
  });

  it("error/borde: ignora items sin id y entradas no-array", () => {
    const remote = [{ id: "A", v: 1 }, { v: "sin id" }, null];
    const local = [undefined, { id: "", v: "vacío" }, { id: "B", v: 2 }];
    const merged = mergeReqsById(remote, local);
    expect(merged).toHaveLength(2);
    expect(merged.map((x) => x.id).sort()).toEqual(["A", "B"]);

    // non-array inputs should not crash
    expect(mergeReqsById(null, undefined)).toEqual([]);
    expect(mergeReqsById("nope", { not: "array" })).toEqual([]);
  });
});
