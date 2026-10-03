import { describe, expect, test } from "bun:test";
import { refreshChampionData } from "./refresh";

describe("OP.GG manual refresh", () => {
  test("starts the list and current detail requests together", async () => {
    const requests: string[] = [];
    await refreshChampionData(
      async () => requests.push("list"),
      async () => requests.push("detail"),
    );
    expect(requests).toEqual(["list", "detail"]);
  });

  test("keeps loading until the second request finishes after the first fails", async () => {
    let finishDetail = () => {};
    const detail = new Promise<void>((resolve) => {
      finishDetail = resolve;
    });
    let finished = false;
    const refresh = refreshChampionData(
      async () => {
        throw new Error("List request failed");
      },
      () => detail,
    ).then(() => {
      finished = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(finished).toBe(false);
    finishDetail();
    await refresh;
    expect(finished).toBe(true);
  });

  test("settles cleanly when both queries fail so the button can be retried", async () => {
    await expect(
      refreshChampionData(
        async () => {
          throw new Error("List request failed");
        },
        async () => {
          throw new Error("Detail request failed");
        },
      ),
    ).resolves.toBeUndefined();
  });
});
