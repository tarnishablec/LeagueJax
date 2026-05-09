import { describe, expect, test } from "bun:test";

describe("mini window visibility behavior", () => {
  test("hides the mini window instead of closing its WebView instance", async () => {
    const titlebar = await Bun.file(
      "src/features/mini/components/MiniTitleBar.tsx",
    ).text();
    const miniWindowShard = await Bun.file(
      "src-tauri/src/shards/mini_window.rs",
    ).text();

    expect(titlebar).toContain("getCurrentWindow().hide()");
    expect(miniWindowShard).toMatch(/async fn hide_window[\s\S]*?\.hide\(\)/);
  });
});
