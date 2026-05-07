import { describe, expect, test } from "bun:test";
import { settingsAboutI18n } from "./about.i18n";
import { createOpenSourceSoftware } from "./about-open-source";

type AboutLocaleResource = {
  settings: {
    about: {
      openSource: {
        roles: Record<string, string>;
      };
    };
  };
};

const aboutResources = settingsAboutI18n as unknown as Record<
  "en" | "zh-CN" | "ja-JP",
  AboutLocaleResource
>;

describe("createOpenSourceSoftware", () => {
  test("includes Community Dragon as a static data source credit", () => {
    const software = createOpenSourceSoftware(
      {
        dependencies: {},
        devDependencies: {},
      },
      "",
    );

    expect(software).toContainEqual({
      name: "Community Dragon",
      version: null,
      license: "Riot Legal Jibber Jabber",
      linkKind: "website",
      roleKey: "communityDragon",
      url: "https://www.communitydragon.org/",
    });
  });
});

describe("settingsAboutI18n", () => {
  test("defines Community Dragon role text for every about locale", () => {
    expect(
      aboutResources.en.settings.about.openSource.roles.communityDragon,
    ).toBe("League of Legends static data and asset source");
    expect(
      aboutResources["zh-CN"].settings.about.openSource.roles.communityDragon,
    ).toBe("提供《英雄联盟》静态数据与游戏资源来源。");
    expect(
      aboutResources["ja-JP"].settings.about.openSource.roles.communityDragon,
    ).toBe("League of Legends の静的データとゲームアセットの提供元。");
  });
});
