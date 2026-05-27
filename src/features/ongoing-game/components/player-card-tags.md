# Player Card Performance Rules

本文档记录对局玩家卡片里 `MVP` / `ACE`、`优异` 与 `伪人` 标签的当前算法。

主要源码入口：

- `src/features/history/utils/match-performance-badge.ts`
- `src/features/ongoing-game/components/player-card-tags.ts`

## MVP / ACE

`MVP` / `ACE` 是单局表现标记。每局只在玩家所在的同队或同小队内比较，不和全场所有玩家比较。

胜负映射：

- 胜局中本队表现第一名显示 `MVP`
- 败局中本队表现第一名显示 `ACE`

比较范围：

- 经典 5v5、嚎哭深渊、大乱斗：按 `teamId` 分组。
- 斗魂或小队模式：优先按 `playerSubteamId` 分组。
- 找不到有效分组时，退回到当前对局参与者集合。

### KDA Strategy

当策略为 `kda` 时，只比较 KDA：

```txt
KDA = (kills + assists) / max(1, deaths)
```

玩家自己的 KDA 必须大于 `0`，并且不低于同组所有玩家的 KDA，才会获得 `MVP` 或 `ACE`。

### Balanced Strategy

当策略为 `balanced` 时，先为同组每个玩家计算综合表现分：

```txt
balancedScore =
  kdaScore
+ participationScore
+ damageScore
+ durabilityScore
+ economyScore
+ csScore
+ visionScore
+ utilityScore
+ controlScore
+ objectiveScore
- deathPenalty
```

具体分项如下。

```txt
kdaScore =
  min(sqrt(KDA), 4) * 4
```

最高约 `16` 分。

```txt
participationScore =
  killParticipation * 20
```

`killParticipation` 优先使用 Riot challenges 中的 `killParticipation`。没有该字段时使用：

```txt
killParticipation =
  (kills + assists) / teamKills
```

```txt
damageScore =
  totalDamageDealtToChampions / maxTeamChampionDamage * 20
+ teamDamagePercentage * 15
```

```txt
rawDurabilityScore =
  totalDamageTaken / maxTeamDamageTaken * 8
+ damageSelfMitigated / maxTeamDamageSelfMitigated * 8
+ damageTakenOnTeamPercentage * 8
```

```txt
durabilityMultiplier =
  max(0.45, 1 - max(0, deaths - 8) * 0.05)
```

```txt
durabilityScore =
  rawDurabilityScore * durabilityMultiplier
```

```txt
economyScore =
  goldEarned / maxTeamGoldEarned * 5
```

```txt
cs =
  totalMinionsKilled + neutralMinionsKilled
```

```txt
csScore =
  cs / maxTeamCs * 4
```

```txt
vision =
  max(visionScore, stealthWardsPlaced + controlWardsPlaced)
```

```txt
visionScore =
  vision / maxTeamVision * 10
```

```txt
utility =
  totalHealsOnTeammates + totalDamageShieldedOnTeammates
```

```txt
utilityScore =
  utility / maxTeamUtility * 14
```

```txt
controlScore =
  totalTimeCcDealt / maxTeamTotalTimeCcDealt * 8
```

```txt
objectiveContribution =
  damageDealtToObjectives
+ damageDealtToBuildings
+ damageDealtToTurrets
+ objectivesStolen * 1500
+ epicMonsterSteals * 1500
```

```txt
objectiveScore =
  objectiveContribution / maxTeamObjectiveContribution * 5
```

```txt
deathPenalty =
  min(
    24,
    max(0, deaths - 6) * 1.25
    + deaths / teamDeaths * 8
  )
```

综合分必须大于 `0` 才能获得 `MVP` 或 `ACE`。

如果综合分相同，按以下顺序继续比较：

1. `balancedScore` 更高
2. `killParticipation` 更高
3. `totalDamageDealtToChampions` 更高
4. `KDA` 更高
5. `deaths` 更少
6. `participantId` 更小

## 优异

`优异` 是近期多局表现标签，不是单局标签。它跟随当前 `MVP` / `ACE` 策略，但独立于单局 `MVP` / `ACE` 展示。

### KDA Strategy

当策略为 `kda` 时，计算近期所有对局的平均 KDA：

```txt
averageKda =
  sum((kills + assists) / max(1, deaths)) / matchCount
```

触发条件：

```txt
averageKda >= 6
```

### Balanced Strategy

当策略为 `balanced` 时，先检查硬性条件：

```txt
matchCount >= 3
```

如果多数对局是负 K/D，直接不显示 `优异`：

```txt
negativeKdGame =
  kills < deaths
```

```txt
negativeKdGameCount > matchCount / 2
```

通过硬性条件后，计算近期平均综合分：

```txt
averageScore =
  sum(balancedScore) / matchCount
```

再计算近期 `MVP` / `ACE` 占比：

```txt
badgeRate =
  mvpOrAceCount / matchCount
```

综合优异分：

```txt
excellentScore =
  averageScore * 0.75
+ badgeRate * 25
```

满足任一条件即可显示 `优异`：

```txt
excellentScore >= 70
```

或者：

```txt
matchCount >= 5
and badgeRate >= 0.6
```

当前常量：

```txt
EXCELLENT_KDA_THRESHOLD = 6
EXCELLENT_BALANCED_MIN_GAMES = 3
EXCELLENT_BALANCED_SCORE_THRESHOLD = 70
EXCELLENT_BALANCED_SCORE_WEIGHT = 0.75
EXCELLENT_BALANCED_MVP_ACE_RATE_BONUS = 25
EXCELLENT_BALANCED_RATE_MIN_GAMES = 5
EXCELLENT_BALANCED_MVP_ACE_RATE_THRESHOLD = 0.6
```

## 伪人

`伪人` 是近期多局、角色感知的个人低贡献标签。它是独立标签，不属于 `MVP` / `ACE` 算法，也不是 `优异` 的简单反向阈值。

展示文案可以使用 `伪人`。内部实现建议使用中性 id，例如 `slump`，避免把展示语气写进业务概念。

### Scope

`伪人` 不使用胜负结果加分。它判断的是玩家近期是否持续表现出低贡献、高负担，或资源投入与实际影响力严重不匹配。

可解释为两个内部信号的合并：

```txt
liabilityScore:
  玩家是否明显拖累队伍

irrelevanceScore:
  队伍表现不错时，玩家是否低影响、低贡献
```

最终只展示一个标签：

```txt
伪人
```

不区分 `liability`、`irrelevant` 或 `roleFailure` 文案。

### Recent Window

只看最近有效对局，默认最多取最近 `6` 场，至少 `3` 场才判定。

有效对局要求：

- 玩家数据存在。
- 可以计算同队或同小队比较范围。
- 不是无法解释的无效局或空数据局。

近期权重按新到旧递减：

```txt
weights = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
```

### Role Strictness

每一局都按该局实际位置评分，再统一聚合。不要用当前对局位置回算历史对局。

职责严格度：

```txt
JUNGLE / ADC:
  高要求

TOP / MIDDLE / UNKNOWN:
  中等要求

SUPPORT:
  低要求
```

无明确位置、无位置模式、大乱斗、斗魂等无法可靠识别职责的场景使用 `UNKNOWN`，按中等要求处理。

角色阈值：

```txt
JUNGLE: 60
ADC: 60
TOP: 65
MIDDLE: 65
UNKNOWN: 65
SUPPORT: 72
```

阈值越低，越容易触发 `伪人`。因此打野和 ADC 要求更高，辅助要求更低。

### Trigger

单局先计算原始分：

```txt
matchPseudoScore =
  contributionDeficit
+ deathBurden
+ participationDeficit
+ resourceWaste
+ roleFailure
- strongEvidenceBonus
```

再按该局位置阈值归一化：

```txt
normalizedScore =
  matchPseudoScore / roleThreshold * 100
```

单局坏局：

```txt
badGame =
  normalizedScore >= 100
```

近期总分：

```txt
recentPseudoScore =
  weightedAverage(normalizedScore)
```

显示 `伪人` 必须同时满足：

```txt
recentPseudoScore >= 100
and badGameCount >= 3
and excellent == false
and mvpAceRate < 0.35
```

### contributionDeficit

`contributionDeficit` 衡量玩家整体贡献是否明显不足。它同时看绝对分、队内排序和队内贡献份额，避免单靠某一项误判。

```txt
contributionDeficit =
  absoluteScoreDeficit * 0.45
+ teamRankDeficit * 0.35
+ teamShareDeficit * 0.20
```

```txt
absoluteScoreDeficit =
  clamp(
    (expectedBalancedScoreByRole - balancedScore)
    / expectedBalancedScoreByRole,
    0,
    1
  ) * 30
```

队内排名缺口：

```txt
teamRankDeficit:
  第 1-2 名: 0
  第 3 名: 10
  第 4 名: 20
  第 5 名: 30
```

小队模式按当前有效 teammate group 排名，不强制认为一定是 5 人队。

```txt
teamShare =
  balancedScore / sum(max(0, teammateBalancedScore))
```

```txt
expectedShare =
  1 / teammateCount
```

```txt
teamShareDeficit =
  clamp(
    (expectedShare * 0.65 - teamShare)
    / (expectedShare * 0.65),
    0,
    1
  ) * 30
```

低于同队平均贡献的 `65%` 才明显加分。

### deathBurden

`deathBurden` 衡量死亡是否已经成为队伍负担。死亡不能只看绝对数，还要看位置职责和队内死亡占比。

```txt
deathBurden =
  roleDeathExcess * 0.55
+ teamDeathShareBurden * 0.45
```

位置死亡基准：

```txt
JUNGLE: 5
ADC: 5
TOP: 6
MIDDLE: 5
SUPPORT: 7
UNKNOWN: 6
```

```txt
roleDeathExcess =
  clamp((deaths - expectedDeaths) / 7, 0, 1) * 20
```

```txt
teamDeathShare =
  deaths / teamDeaths
```

```txt
expectedDeathShare =
  1 / teammateCount
```

```txt
teamDeathShareBurden =
  clamp(
    (teamDeathShare - expectedDeathShare * 1.35)
    / expectedDeathShare,
    0,
    1
  ) * 20
```

ADC 特殊规则：

```txt
if position = ADC
and damageConversion is poor
and teamDeathShare is high
then deathBurden *= 1.2
```

辅助保护：

```txt
if position = SUPPORT
and (killParticipation is high or vision/control/utility is high)
then deathBurden *= 0.75
```

### participationDeficit

`participationDeficit` 衡量参团是否低于该位置期望。

优先使用 Riot challenges：

```txt
participant.challenges.killParticipation
```

没有该字段时回退：

```txt
killParticipation =
  (kills + assists) / teamKills
```

```txt
participationDeficit =
  clamp((expectedKP - killParticipation) / expectedKP, 0, 1) * 15
```

位置期望：

```txt
JUNGLE: 0.60
MIDDLE: 0.55
SUPPORT: 0.62
ADC: 0.52
TOP: 0.45
UNKNOWN: 0.50
```

保护规则：

```txt
TOP:
  如果 damageDealtToTurrets 或 split-push pressure 高，
  participationDeficit *= 0.7

SUPPORT:
  如果 vision/control/utility 高，
  participationDeficit *= 0.75

JUNGLE:
  如果 objectiveContribution 高，
  participationDeficit *= 0.8
```

### resourceWaste

`resourceWaste` 是 `伪人` 的核心项之一。它不惩罚资源少，而是惩罚资源高但影响低。

```txt
resourceWaste =
  highResourceShare
  * lowImpactConversion
  * 15
```

```txt
resourceShare =
  goldEarned / teamGoldEarned
```

```txt
expectedResourceShare =
  1 / teammateCount
```

```txt
highResourceShare =
  clamp(
    (resourceShare - expectedResourceShare * 1.1)
    / expectedResourceShare,
    0,
    1
  )
```

影响份额：

```txt
impactShare =
  max(
    damageShare,
    killParticipation,
    objectiveContributionShare,
    utilityShare
  )
```

```txt
lowImpactConversion =
  clamp(
    (resourceShare * 0.8 - impactShare)
    / (resourceShare * 0.8),
    0,
    1
  )
```

位置修正：

```txt
ADC:
  resourceWaste *= 1.25

JUNGLE:
  resourceWaste *= 1.15

SUPPORT:
  resourceWaste *= 0.35

TOP / MIDDLE / UNKNOWN:
  resourceWaste *= 1.0
```

### roleFailure

`roleFailure` 衡量该位置特有职责是否失败。每个位置输出 `0-25`。

#### JUNGLE

打野不因为输而加分，只因为资源控制、节奏、参团、野区控制缺口加分。

```txt
jungleFailure =
  lowObjectiveControl * 10
+ lowEarlyTempo * 6
+ lowJungleControl * 5
+ lowMapPressure * 4
```

```txt
objectiveContribution =
  damageDealtToObjectives
+ damageDealtToEpicMonsters
+ damageDealtToTurrets * 0.25
+ objectivesStolen * 1500
+ epicMonsterSteals * 1500
```

```txt
lowObjectiveControl:
  objectiveContributionShare 明显低时加分

lowEarlyTempo:
  jungleCsBefore10Minutes 低
  and initialCrabCount 低
  and initialBuffCount 低

lowJungleControl:
  enemyJungleMonsterKills 低
  and moreEnemyJungleThanOpponent <= 0

lowMapPressure:
  killParticipation 低
  and junglerTakedownsNearDamagedEpicMonster 低
```

#### ADC

ADC 的重点不是死亡本身，而是资源、输出和团队影响是否匹配。

```txt
adcFailure =
  lowDamageShare * 10
+ lowDamagePerGold * 8
+ lowObjectiveOrTurretDamage * 4
+ unsafeLowImpactDeaths * 3
```

#### SUPPORT

辅助不因低伤害、低经济、低 CS 被判 `伪人`。辅助重点看参团、视野、控制、保护和死亡负担。

```txt
supportFailure =
  lowVision * 9
+ lowControl * 6
+ lowUtility * 6
+ lowAssistParticipation * 4
```

可用信号：

```txt
visionScore
visionScorePerMinute
wardsPlaced
wardsKilled
controlWardsPlaced
totalTimeCcDealt
enemyChampionImmobilizations
totalHealsOnTeammates
totalDamageShieldedOnTeammates
effectiveHealAndShielding
saveAllyFromDeath
killParticipation
```

#### TOP / MIDDLE / UNKNOWN

中单、上单和无位置模式使用中等要求。

```txt
genericRoleFailure =
  lowDamageOrPressure * 10
+ lowLaneOrObjectiveContribution * 7
+ lowParticipationForRole * 5
+ unsafeDeaths * 3
```

上单可降低参团项：

```txt
TOP participation penalty *= 0.75
```

### strongEvidenceBonus

`strongEvidenceBonus` 是防误判机制，最多扣 `30` 分。

```txt
strongEvidenceBonus =
  mvpAceBonus
+ highContributionBonus
+ roleEvidenceBonus
```

```txt
mvpAceBonus =
  当前局有 MVP/ACE ? 18 : 0
```

```txt
highContributionBonus =
  balancedScore 队内前 2 ? 8 : 0
  或 teamShare >= expectedShare * 1.15 ? 8 : 0
```

角色反证：

```txt
JUNGLE:
  objectiveContributionShare 队内很高
  or epicMonsterSteals > 0
  or killParticipation >= 0.70
  => +8

ADC:
  teamDamagePercentage 高
  or damagePerGold 高
  or turret/objective damage 高
  => +8

SUPPORT:
  vision/control/utility 任一明显高
  or killParticipation >= 0.70
  => +10

TOP / MIDDLE / UNKNOWN:
  damageShare 高
  or turret/objective pressure 高
  or killParticipation 高
  => +8
```

最终：

```txt
strongEvidenceBonus =
  min(30, sum)
```

### Display Rules

`伪人` 与 `MVP` / `ACE` 分开。`MVP` / `ACE` 是单局表现标记，`伪人` 是近期多局表现标签。

`伪人` 与 `优异` 分开。`优异` 是近期优秀表现标签，`伪人` 是近期低贡献标签，二者互斥但不共享触发逻辑。

显示顺序：

```txt
order 10: 连胜
order 20: 连败
order 30: 场均单杀
order 40: 优异
order 45: 伪人
```

共存规则：

```txt
连胜 + 伪人: 允许
连败 + 伪人: 允许
场均单杀 + 伪人: 允许
优异 + 伪人: 禁止
MVP/ACE + 伪人: 不直接互斥，但高 MVP/ACE rate 会阻止近期伪人触发
```

## 人机

`人机` 是卡片头部身份标签，不参与战绩表现算法。

显示规则：

```txt
slotKind == bot
and bot tag enabled
```

它有独立的启用开关和颜色设置。关闭 `人机` 标签只隐藏卡片头部的人机标记，不影响 `显示机器人卡片` 设置。
