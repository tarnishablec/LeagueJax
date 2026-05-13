# LeagueJax

[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

[![Release](https://img.shields.io/github/v/release/tarnishablec/LeagueJax?label=release)](https://github.com/tarnishablec/LeagueJax/releases)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

LeagueJax is a desktop companion for League of Legends players. It brings client state, match context, player lookup, match history, lightweight overlays, and practical companion actions into a cleaner desktop experience.

It is not a game enhancer or a competitive advantage tool. LeagueJax focuses on the repeated tasks around normal play: checking players, reviewing matches, understanding the current session, managing replays, reducing repetitive actions, and keeping useful information visible without interrupting the flow of the game.

## Download And Status

Official builds are published on the Releases page of this repository:

[Download LeagueJax](https://github.com/tarnishablec/LeagueJax/releases)

The project is still in early iteration. Features, interface details, release cadence, and update behavior may continue to change. Use the latest release when possible and review the release notes before updating.

## Why This Project Exists

LeagueJax is directly connected to [League Akari](https://github.com/Hanxven/LeagueAkari). Since Akari has also moved to a partially open-source strategy, it made sense to rethink how a desktop League of Legends tool should define its product experience, public boundary, and release model. LeagueJax was created as a project for learning and practicing Tauri desktop application development, while also exploring a player tool that better matches my own workflow.

LeagueJax is not a copy of Akari and does not aim to replace it. It is an independent project. Its product design may reference Akari's desktop-tool experience, but its feature choices, pace, and boundaries are decided by LeagueJax itself.

## Main Capabilities

### Match Context

LeagueJax organizes key state around the current game flow, helping players understand the current phase, team information, and related context more quickly. It is designed for moments around queueing, champion select, and entering or leaving a match, reducing window switching and manual lookup.

### Match History And Player Lookup

LeagueJax helps players review recent performance, inspect match history, and look up relevant player profiles when needed. The goal is review and information organization, not automated decision-making.

### Compact Overlay

LeagueJax provides a lightweight overlay form for keeping useful information available during play. The overlay is designed to be low-interruption, easy to scan, and quick to confirm.

### Replays And Tools

LeagueJax will gradually improve replay management, client-side companion actions, and other practical tools so that operations scattered across the client can become more centralized.

### Notifications And Settings

The project keeps notifications and settings configurable, so behavior remains explicit, controllable, and easy to review.

## Open-Source Strategy

LeagueJax uses a partially open-source strategy. The public repository keeps the product shell, interface, foundation, and public project materials available, while some core implementation remains outside the public repository.

The reason is straightforward: tools in this category are easy for bad actors to rebrand, repackage, and sell or distribute in misleading ways. LeagueJax aims to share project ideas and learning outcomes while reducing the risk of low-effort repackaging.

## License

The project as a whole uses the GPL-3.0 license. Source files and assets in the public repository are governed by the [LICENSE](LICENSE) file in this repository.

Some non-public components are not provided in this public repository. When using, distributing, or modifying the public portions, follow the GPL-3.0 requirements and preserve attribution to the original project.

## Unofficial Notice

LeagueJax is an unofficial project. It is not affiliated with, sponsored by, endorsed by, or partnered with Riot Games, Tencent Games, or the official League of Legends product.

League of Legends and related materials, names, icons, and game content belong to their respective rights holders. LeagueJax is only a desktop companion tool for players and does not represent an official product.

When using this project, confirm that your usage complies with the rules of your region, server, and game client.
