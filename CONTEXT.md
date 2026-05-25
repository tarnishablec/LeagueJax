# LeagueJax Context

This context defines LeagueJax's product language for ranked analysis. It keeps internal rank/MMR terminology separate from Riot's hidden matchmaking systems.

## Language

**MMR Reference Scale**:
LeagueJax's internal consensus scale for mapping visible League ranks to rough MMR-like numeric ranges.
_Avoid_: true MMR, Riot MMR, official MMR, exact hidden score

**Rank MMR Anchor**:
One tier's range inside the **MMR Reference Scale**.
_Avoid_: official tier range, real MMR bracket

**MMR Estimate**:
A derived analysis result that compares player signals against the **MMR Reference Scale**.
_Avoid_: actual MMR, confirmed MMR

**Rank Equivalent**:
A rank label used to describe where an **MMR Estimate** lands on the **MMR Reference Scale**.
_Avoid_: real rank, deserved rank

## Relationships

- An **MMR Reference Scale** contains one or more **Rank MMR Anchors**.
- An **MMR Estimate** may reference exactly one **MMR Reference Scale**.
- A **Rank Equivalent** is derived from an **MMR Estimate** and one **MMR Reference Scale**.

## Example dialogue

> **Dev:** "Can the agent say this player has 1840 real MMR?"
> **Domain expert:** "No. It can say the player's **MMR Estimate** lands near the Gold **Rank Equivalent** on the **MMR Reference Scale**."

## Flagged ambiguities

- "MMR" was used to mean both Riot's hidden matchmaking value and LeagueJax's internal reference number. Resolved: Riot's value is not observable; LeagueJax uses **MMR Reference Scale** for internal consensus.
- "endpoint" was used for a new rank/MMR MCP capability. Resolved: LeagueJax exposes this as an MCP tool under the existing MCP endpoint, not as a separate HTTP endpoint.
