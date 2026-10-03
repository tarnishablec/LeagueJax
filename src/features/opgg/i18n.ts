import type { OpggRankTier, OpggRegion } from "@/bindings/opgg";
import type { LocaleResource } from "@/i18n/types";

const championsCopy = {
  title: {
    en: "Champions",
    "zh-CN": "英雄",
    "ja-JP": "チャンピオン",
  },
  source: {
    en: "OP.GG · {{region}} · {{rank}} · Patch {{version}}",
    "zh-CN": "OP.GG · {{region}} · {{rank}} · 版本 {{version}}",
    "ja-JP": "OP.GG · {{region}} · {{rank}} · パッチ {{version}}",
  },
  search: {
    en: "Search champions",
    "zh-CN": "搜索英雄",
    "ja-JP": "チャンピオンを検索",
  },
  allPositions: { en: "All", "zh-CN": "全部", "ja-JP": "すべて" },
  overview: {
    en: "Champion overview",
    "zh-CN": "英雄概览",
    "ja-JP": "チャンピオン概要",
  },
  champion: { en: "Champion", "zh-CN": "英雄", "ja-JP": "チャンピオン" },
  gameCount: { en: "Games", "zh-CN": "场次", "ja-JP": "試合数" },
  builds: {
    en: "Recommended build",
    "zh-CN": "推荐出装",
    "ja-JP": "おすすめビルド",
  },
  buildType: { en: "Build", "zh-CN": "出装方案", "ja-JP": "ビルド" },
  buildAlternative: {
    en: "Option {{number}}",
    "zh-CN": "方案 {{number}}",
    "ja-JP": "候補 {{number}}",
  },
  matchups: { en: "Matchups", "zh-CN": "对位表现", "ja-JP": "マッチアップ" },
  skillPriority: {
    en: "Max priority",
    "zh-CN": "升级优先级",
    "ja-JP": "優先順位",
  },
  skillLevels: {
    en: "Order by level",
    "zh-CN": "逐级加点",
    "ja-JP": "レベル別の取得順",
  },
  level: {
    en: "Level {{level}}",
    "zh-CN": "等级 {{level}}",
    "ja-JP": "レベル {{level}}",
  },
  inferredSkillLevel: {
    en: "Level {{level}} · Inferred from skill caps and priority",
    "zh-CN": "等级 {{level}} · 按技能等级上限与优先级补全",
    "ja-JP": "レベル {{level}} · スキル上限と優先順位から補完",
  },
  unavailableSkillLevel: {
    en: "Level {{level}} · Not enough data to infer this skill point",
    "zh-CN": "等级 {{level}} · 数据不足，无法可靠推导",
    "ja-JP": "レベル {{level}} · データ不足のため推測できません",
  },
  noData: {
    en: "No data available",
    "zh-CN": "暂无数据",
    "ja-JP": "データがありません",
  },
  emptyHint: {
    en: "Try another name or position.",
    "zh-CN": "试试其他名称或位置。",
    "ja-JP": "別の名前やポジションをお試しください。",
  },
  winRate: { en: "Win rate", "zh-CN": "胜率", "ja-JP": "勝率" },
  pickRate: { en: "Pick rate", "zh-CN": "选取率", "ja-JP": "ピック率" },
  banRate: { en: "Ban rate", "zh-CN": "禁用率", "ja-JP": "バン率" },
  tier: {
    en: "Tier {{tier}}",
    "zh-CN": "{{tier}} 梯队",
    "ja-JP": "ティア {{tier}}",
  },
  games: {
    en: "{{count}} games",
    "zh-CN": "{{count}} 场",
    "ja-JP": "{{count}} 試合",
  },
  loading: {
    en: "Loading OP.GG",
    "zh-CN": "正在读取 OP.GG",
    "ja-JP": "OP.GG を読み込み中",
  },
  loadFailed: {
    en: "Could not load OP.GG champion data",
    "zh-CN": "没能读到 OP.GG 的英雄数据",
    "ja-JP": "OP.GG のチャンピオンデータを読み込めませんでした",
  },
  detailFailed: {
    en: "Could not load this champion",
    "zh-CN": "这个英雄的数据没能读出来",
    "ja-JP": "このチャンピオンのデータを読み込めませんでした",
  },
  empty: {
    en: "No champions match",
    "zh-CN": "没有符合的英雄",
    "ja-JP": "一致するチャンピオンがありません",
  },
  strong: { en: "Strong against", "zh-CN": "克制", "ja-JP": "有利" },
  weak: { en: "Weak against", "zh-CN": "被克制", "ja-JP": "不利" },
  skills: { en: "Skill order", "zh-CN": "加点", "ja-JP": "スキル順" },
  spells: {
    en: "Summoner spells",
    "zh-CN": "召唤师技能",
    "ja-JP": "サモナースペル",
  },
  starter: { en: "Starter", "zh-CN": "出门装", "ja-JP": "初期アイテム" },
  boots: { en: "Boots", "zh-CN": "鞋子", "ja-JP": "ブーツ" },
  core: { en: "Core build", "zh-CN": "核心出装", "ja-JP": "コアビルド" },
  situational: {
    en: "Later items",
    "zh-CN": "后期装备",
    "ja-JP": "後期アイテム",
  },
} as const;

const settingsCopy = {
  filters: { en: "Filters", "zh-CN": "筛选", "ja-JP": "フィルター" },
  rankTier: { en: "Rank", "zh-CN": "段位", "ja-JP": "ランク" },
  region: { en: "Region", "zh-CN": "地区", "ja-JP": "地域" },
  matchups: { en: "Matchups", "zh-CN": "对位", "ja-JP": "マッチアップ" },
  counterColumnLimitLabel: {
    en: "Matchups per column",
    "zh-CN": "每列对位条目数",
    "ja-JP": "各列のマッチアップ表示数",
  },
  counterColumnLimitHint: {
    en: "Show up to this many strong and weak matchups per column (1–50). Fewer appear when data is limited. Also applies to the mini window.",
    "zh-CN":
      "克制与被克制两列各显示最多此数量的条目（1–50）。数据不足时显示实际可用条目；小窗也会使用此设置。",
    "ja-JP":
      "有利・不利の各列に表示する最大件数です（1〜50）。データが少ない場合は表示数も少なくなります。ミニウィンドウにも適用されます。",
  },
} as const;

const positions = {
  TOP: { en: "Top", "zh-CN": "上单", "ja-JP": "トップ" },
  JUNGLE: { en: "Jungle", "zh-CN": "打野", "ja-JP": "ジャングル" },
  MID: { en: "Mid", "zh-CN": "中单", "ja-JP": "ミッド" },
  ADC: { en: "Bot", "zh-CN": "下路", "ja-JP": "ボット" },
  SUPPORT: { en: "Support", "zh-CN": "辅助", "ja-JP": "サポート" },
} as const;

const regions = {
  global: { en: "Global", "zh-CN": "全球", "ja-JP": "全地域" },
  na: { en: "North America", "zh-CN": "北美", "ja-JP": "北米" },
  me: { en: "Middle East", "zh-CN": "中东", "ja-JP": "中東" },
  euw: { en: "Europe West", "zh-CN": "西欧", "ja-JP": "西ヨーロッパ" },
  eune: {
    en: "Europe Nordic & East",
    "zh-CN": "东北欧",
    "ja-JP": "北・東ヨーロッパ",
  },
  oce: { en: "Oceania", "zh-CN": "大洋洲", "ja-JP": "オセアニア" },
  kr: { en: "Korea", "zh-CN": "韩国", "ja-JP": "韓国" },
  jp: { en: "Japan", "zh-CN": "日本", "ja-JP": "日本" },
  br: { en: "Brazil", "zh-CN": "巴西", "ja-JP": "ブラジル" },
  las: {
    en: "Latin America South",
    "zh-CN": "拉美南",
    "ja-JP": "ラテンアメリカ南",
  },
  lan: {
    en: "Latin America North",
    "zh-CN": "拉美北",
    "ja-JP": "ラテンアメリカ北",
  },
  ru: { en: "Russia", "zh-CN": "俄罗斯", "ja-JP": "ロシア" },
  tr: { en: "Türkiye", "zh-CN": "土耳其", "ja-JP": "トルコ" },
  sea: { en: "Southeast Asia", "zh-CN": "东南亚", "ja-JP": "東南アジア" },
  tw: { en: "Taiwan", "zh-CN": "台湾", "ja-JP": "台湾" },
  vn: { en: "Vietnam", "zh-CN": "越南", "ja-JP": "ベトナム" },
} satisfies Record<OpggRegion, Record<"en" | "zh-CN" | "ja-JP", string>>;

const rankTiers = {
  all: { en: "All ranks", "zh-CN": "所有段位", "ja-JP": "全ランク" },
  challenger: {
    en: "Challenger",
    "zh-CN": "最强王者",
    "ja-JP": "チャレンジャー",
  },
  grandmaster: {
    en: "Grandmaster",
    "zh-CN": "傲世宗师",
    "ja-JP": "グランドマスター",
  },
  master_plus: {
    en: "Master+",
    "zh-CN": "超凡大师+",
    "ja-JP": "マスター+",
  },
  master: { en: "Master", "zh-CN": "超凡大师", "ja-JP": "マスター" },
  diamond_plus: {
    en: "Diamond+",
    "zh-CN": "璀璨钻石+",
    "ja-JP": "ダイヤモンド+",
  },
  diamond: { en: "Diamond", "zh-CN": "璀璨钻石", "ja-JP": "ダイヤモンド" },
  emerald_plus: {
    en: "Emerald+",
    "zh-CN": "流光翡翠+",
    "ja-JP": "エメラルド+",
  },
  emerald: { en: "Emerald", "zh-CN": "流光翡翠", "ja-JP": "エメラルド" },
  platinum_plus: {
    en: "Platinum+",
    "zh-CN": "华贵铂金+",
    "ja-JP": "プラチナ+",
  },
  platinum: { en: "Platinum", "zh-CN": "华贵铂金", "ja-JP": "プラチナ" },
  gold_plus: { en: "Gold+", "zh-CN": "荣耀黄金+", "ja-JP": "ゴールド+" },
  gold: { en: "Gold", "zh-CN": "荣耀黄金", "ja-JP": "ゴールド" },
  silver: { en: "Silver", "zh-CN": "不屈白银", "ja-JP": "シルバー" },
  bronze: { en: "Bronze", "zh-CN": "英勇黄铜", "ja-JP": "ブロンズ" },
  iron: { en: "Iron", "zh-CN": "坚韧黑铁", "ja-JP": "アイアン" },
} satisfies Record<OpggRankTier, Record<"en" | "zh-CN" | "ja-JP", string>>;

function localeTree(locale: "en" | "zh-CN" | "ja-JP") {
  return {
    nav: { champions: "OP.GG" },
    settings: {
      pages: { opgg: { title: "OP.GG" } },
      sections: {
        opgg: {
          filters: { title: settingsCopy.filters[locale] },
          matchups: { title: settingsCopy.matchups[locale] },
        },
      },
      opgg: {
        rankTier: { label: settingsCopy.rankTier[locale] },
        region: { label: settingsCopy.region[locale] },
        counterColumnLimit: {
          label: settingsCopy.counterColumnLimitLabel[locale],
          hint: settingsCopy.counterColumnLimitHint[locale],
        },
      },
    },
    champions: {
      title: championsCopy.title[locale],
      source: championsCopy.source[locale],
      search: championsCopy.search[locale],
      allPositions: championsCopy.allPositions[locale],
      regions: Object.fromEntries(
        Object.entries(regions).map(([key, labels]) => [key, labels[locale]]),
      ),
      rankTiers: Object.fromEntries(
        Object.entries(rankTiers).map(([key, labels]) => [key, labels[locale]]),
      ),
      overview: championsCopy.overview[locale],
      champion: championsCopy.champion[locale],
      gameCount: championsCopy.gameCount[locale],
      builds: championsCopy.builds[locale],
      buildType: championsCopy.buildType[locale],
      buildAlternative: championsCopy.buildAlternative[locale],
      matchups: championsCopy.matchups[locale],
      skillPriority: championsCopy.skillPriority[locale],
      skillLevels: championsCopy.skillLevels[locale],
      level: championsCopy.level[locale],
      inferredSkillLevel: championsCopy.inferredSkillLevel[locale],
      unavailableSkillLevel: championsCopy.unavailableSkillLevel[locale],
      noData: championsCopy.noData[locale],
      emptyHint: championsCopy.emptyHint[locale],
      winRate: championsCopy.winRate[locale],
      pickRate: championsCopy.pickRate[locale],
      banRate: championsCopy.banRate[locale],
      tier: championsCopy.tier[locale],
      games: championsCopy.games[locale],
      loading: championsCopy.loading[locale],
      loadFailed: championsCopy.loadFailed[locale],
      detailFailed: championsCopy.detailFailed[locale],
      empty: championsCopy.empty[locale],
      strong: championsCopy.strong[locale],
      weak: championsCopy.weak[locale],
      skills: championsCopy.skills[locale],
      spells: championsCopy.spells[locale],
      starter: championsCopy.starter[locale],
      boots: championsCopy.boots[locale],
      core: championsCopy.core[locale],
      situational: championsCopy.situational[locale],
      positions: {
        TOP: positions.TOP[locale],
        JUNGLE: positions.JUNGLE[locale],
        MID: positions.MID[locale],
        ADC: positions.ADC[locale],
        SUPPORT: positions.SUPPORT[locale],
      },
    },
  };
}

export const championsI18n: LocaleResource = {
  en: localeTree("en"),
  "zh-CN": localeTree("zh-CN"),
  "ja-JP": localeTree("ja-JP"),
};
