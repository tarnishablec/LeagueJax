# Player Card Performance Rules

本文档记录对局玩家卡片里 `MVP` / `ACE` 与 `优异` 标签的当前算法。

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

`优异` 是近期多局表现标签，不是单局标签。它跟随当前 `MVP` / `ACE` 策略。

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
