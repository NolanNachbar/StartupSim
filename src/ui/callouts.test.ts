import { describe, expect, it } from "vitest";
import { CALLOUTS, nextCallout, type CalloutContext } from "./callouts";

const base: CalloutContext = {
  enabled: true, shown: [], screen: "week", startPivots: 4, pivotsRemaining: 4,
  hasUntested: true, hasVerified: false, crashed: false,
};

describe("callouts", () => {
  it("has at most five, each with plain copy", () => {
    expect(CALLOUTS.length).toBeLessThanOrEqual(5);
    for (const c of CALLOUTS) expect(c.text.length).toBeGreaterThan(20);
  });

  it("shows the dotted-line note first on a fresh week screen", () => {
    expect(nextCallout(base)?.id).toBe("dotted");
  });

  it("shows nothing when switched off", () => {
    expect(nextCallout({ ...base, enabled: false })).toBeNull();
  });

  it("never repeats a callout that was shown", () => {
    expect(nextCallout({ ...base, shown: ["dotted"] })).toBeNull();
  });

  it("explains pivots once the gauge has changed", () => {
    expect(nextCallout({ ...base, shown: ["dotted"], pivotsRemaining: 3 })?.id).toBe("pivots");
  });

  it("explains verified lines when the first one appears", () => {
    expect(nextCallout({ ...base, shown: ["dotted", "pivots"], hasVerified: true })?.id).toBe("verified");
  });

  it("explains interview question types on the interview form", () => {
    expect(nextCallout({ ...base, screen: "interview" })?.id).toBe("interview");
  });

  it("explains the report on a crash, only on the report screen", () => {
    expect(nextCallout({ ...base, screen: "report", crashed: true })?.id).toBe("crash");
    expect(nextCallout({ ...base, screen: "report", crashed: false })).toBeNull();
    expect(nextCallout({ ...base, screen: "board" })).toBeNull();
  });
});
