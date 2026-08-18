[![Checks](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/workflows/checks/badge.svg)](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/actions)
[![Latest Release](https://img.shields.io/github/v/release/nivthefox/foundryvtt-sosly-5e-house-rules)](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/latest)
[![License](https://img.shields.io/github/license/nivthefox/foundryvtt-sosly-5e-house-rules)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/nivthefox/foundryvtt-sosly-5e-house-rules)](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/issues)
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://raw.githubusercontent.com/nivthefox/foundryvtt-sosly-5e-house-rules/main/module.json)](https://foundryvtt.com/)

# SoSly House Rules
House Rules for 5th Edition Dungeons and Dragons in FoundryVTT.

This module provides custom house rules, conditions, classes, spells, equipment, and other content for D&D 5e campaigns.

## Requirements
- **Foundry VTT:** v13
- **System:** D&D 5e v5.1+
- **Dependencies:**
  - lib-wrapper v1.0.0.0+
  - dnd5e-spellpoints v2.4.22+
  - items-with-spells-5e v13.0.2+
  - ActiveAuras v0.12.2+

## Features
- Custom house rules and mechanics
- New character classes and origins
- Additional spells and psionics
- Custom equipment and feats
- Monsters and monster features
- Effect tables for various mechanics

## Installation
Install via Foundry's module browser or use this manifest URL:
```
https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/latest/download/module.json
```

## Issues
Report bugs and feature requests on [GitHub Issues](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/issues).

## Testing

Unit tests, linting, and the complete release build do not require a Foundry license:

```shell
npm run test:unit
npm run lint:code
npm run build
```

The Playwright integration suite requires a licensed Foundry runtime. The supported environment uses Foundry 13.350 and installs dnd5e 5.1.9 into an isolated Docker volume:

```shell
docker compose -f docker-compose.test.yml up --detach --wait
npm run test:integration:setup
npm run test:integration
```

Set `FOUNDRY_USERNAME` and `FOUNDRY_PASSWORD`, or `FOUNDRY_LICENSE_KEY`, before starting the container. Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome browser instead of Playwright's bundled Chromium. Use `FOUNDRY_TEST_PORT` and the corresponding `FOUNDRY_TEST_URL` when port 30000 is already occupied.

Run the integration suite twice against a newly created environment to detect setup or cleanup state that is not repeatable. Remove only this environment and its isolated data with:

```shell
docker compose -f docker-compose.test.yml down --volumes
```

Public CI does not receive a Foundry license, so it runs every license-independent check but does not represent those checks as integration coverage.
