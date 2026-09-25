import { describe, expect, it } from "vitest";

describe("toolchain", () => {
  it("runs a TypeScript test under Vitest", () => {
    const sum: number = 1 + 1;
    expect(sum).toBe(2);
  });
});
