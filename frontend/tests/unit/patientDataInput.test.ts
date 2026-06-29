import { describe, expect, it } from "vitest";
import { normalizePatientNumericInput } from "../../src/lib/patientDataInput";

describe("patient data numeric input normalization", () => {
  it("keeps valid two-digit birth months with leading zero", () => {
    expect(normalizePatientNumericInput("birthMonth", "01")).toBe("01");
    expect(normalizePatientNumericInput("birthMonth", "07")).toBe("07");
  });

  it("does not keep longer leading-zero birth month values", () => {
    expect(normalizePatientNumericInput("birthMonth", "010")).toBe("10");
    expect(normalizePatientNumericInput("birthMonth", "001")).toBe("1");
  });

  it("removes leading zeros from birth year, height and weight", () => {
    expect(normalizePatientNumericInput("birthYear", "01990")).toBe("1990");
    expect(normalizePatientNumericInput("height", "0175")).toBe("175");
    expect(normalizePatientNumericInput("weight", "080")).toBe("80");
  });

  it("removes non-digit characters from numeric patient data fields", () => {
    expect(normalizePatientNumericInput("birthMonth", "0a7")).toBe("07");
    expect(normalizePatientNumericInput("height", "1e75")).toBe("175");
  });
});
