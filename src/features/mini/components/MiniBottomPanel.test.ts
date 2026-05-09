import { describe, expect, test } from "bun:test";
import { resolveMiniBottomPanelKind } from "./mini-bottom-panel-kind";

describe("resolveMiniBottomPanelKind", () => {
  test("dispatches bottom panels from the ongoing phase", () => {
    expect(resolveMiniBottomPanelKind("Idle")).toBe("none");
    expect(resolveMiniBottomPanelKind("Matchmaking")).toBe("autoAccept");
    expect(resolveMiniBottomPanelKind("ReadyCheck")).toBe("autoAccept");
    expect(resolveMiniBottomPanelKind("ChampSelect")).toBe("champSelectDodge");
    expect(resolveMiniBottomPanelKind("InGame")).toBe("none");
  });
});
