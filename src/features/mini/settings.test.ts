import { describe, expect, test } from "bun:test";
import { MINI_ALWAYS_ON_TOP_SETTING_ID, MINI_PIN_SETTING_ID } from "./settings";

describe("mini settings", () => {
  test("keeps follow pin and window topmost as separate settings", () => {
    expect(MINI_PIN_SETTING_ID).toBe("mini.preference.pin");
    expect(MINI_ALWAYS_ON_TOP_SETTING_ID).toBe("mini.preference.alwaysOnTop");
    expect(MINI_ALWAYS_ON_TOP_SETTING_ID).not.toBe(MINI_PIN_SETTING_ID);
  });
});
