import { describe, expect, test } from "bun:test";

function opaqueBodyOrRootBackgrounds(html: string): string[] {
  const css = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  return css.split("}").flatMap((rule) => {
    const [selector, declarations] = rule.split("{");
    if (!selector || !declarations) {
      return [];
    }

    const selectors = selector.split(",").map((item) => item.trim());
    const coversBodyOrRoot =
      selectors.includes("body") || selectors.includes("#root");
    if (!coversBodyOrRoot) {
      return [];
    }

    return [...declarations.matchAll(/background:\s*([^;]+)/gi)]
      .map((match) => match[1]?.trim() ?? "")
      .filter((value) => value.toLowerCase() !== "transparent");
  });
}

describe("mini window entry document", () => {
  test("does not paint an opaque body or root background over themed backdrop", async () => {
    const html = await Bun.file("mini.html").text();

    expect(opaqueBodyOrRootBackgrounds(html)).toEqual([]);
  });
});
