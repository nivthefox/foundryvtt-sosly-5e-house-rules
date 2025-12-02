# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.26.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.26.1) - 2025-12-06

### Added
- Add "At Will" option for Items with Spells override configuration (unlimited casting with no use tracking)

### Fixed
- Fix Items with Spells migration not working with data from items-with-spells-5e module
- Fix spell uses not displaying on NPC spellcasting tab for Items with Spells
- Fix spell overrides not being applied to embedded spells when configured on items already on an actor

## [1.26.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.26.0) - 2025-12-03

### Added
- Add Blood Sorcery subclass for Sorcerer

### Changed
- Update Beast Heart Communion feat: rename "Wild Healing" to "Wild Casting" and expand to allow casting all Beast Form spells while wild shaped (instead of only Cure Wounds)
- Increase Psionic Blast damage from 1d6/pp to 1d10 + 1d10/pp

### Removed
- Legendary action combat recovery (now handled natively by dnd5e 5.1)

### Fixed
- Fix Blood Magic blood pool meter not appearing on character sheets in Foundry v13 with dnd5e 5.1
- Fix Breather button not appearing on actor sheets in Foundry v13 with dnd5e 5.1
- Fix Breather dialog failing to open due to missing rest type configuration
- Fix Breather hit die roll deprecation warning for FormDataExtended
- Fix concentration rest dialog crash when prompting to end concentration
- Fix Imperiled condition deprecation warnings in Foundry v13 with dnd5e 5.1
- Fix Imperiled combat turn handler error when combatant data is unavailable
- Fix Items with Spells spellbook sections not displaying in Foundry v13 with dnd5e 5.1
- Fix Location sheet not respecting dark mode theme
- Fix Location sheet items not appearing in inventory
- Fix Location sheet drag and drop to containers
- Fix Location sheet search/filter not working in play mode
- Fix Madness meter not appearing on character sheets in Foundry v13 with dnd5e 5.1
- Fix Net Worth display not appearing on character sheets in Foundry v13 with dnd5e 5.1
- Fix Psionic disciplines section not appearing on character sheets in Foundry v13 with dnd5e 5.1
- Fix Psionicist manifesting card not appearing on character sheets in Foundry v13 with dnd5e 5.1

## [1.25.3](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.25.3) - 2025-11-22

### Fixed
- Fix spells not appearing on actor sheet when dragged onto embedded item's spells tab

## [1.25.2](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.25.2) - 2025-11-22

### Fixed
- Fix Items with Spells override dialog crash when spell entry is missing or cannot be loaded

## [1.25.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.25.1) - 2025-11-22

### Fixed
- Fix custom currency abbreviations displaying as localization keys instead of translated values in item currency dropdowns

## [1.25.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.25.0) - 2025-11-22

### Added
- Add Custom Currency feature to replace standard D&D currency names with setting-specific alternatives (Krynn/Dragonlance and Cormyr/Forgotten Realms presets available)
- Add Items with Spells feature allowing magic items to grant spells to their owners with drag & drop linking, automatic spell management, and custom override configurations
- Add migration tool from items-with-spells-5e module
- Add Language Choice feature to configure campaign-specific language sets (D&D 5e Default, Dragonlance, Forgotten Realms, or Severed Lands)
- Add optional Cunning Strike features for Rogue subclasses at 6th level (Thief, Arcane Trickster, Assassin, Soulknife)
- Add Lingering Injuries optional rule to Severed Lands house rules
- Add Lingering Injuries roll table (1d20) with 20 injury results

### Changed
- Migrate all pack items from items-with-spells-5e to integrated Items with Spells feature (57 psionic disciplines, 2 class features)

### Fixed
- Fix psionic discipline focus effect icons to match discipline icons

## [1.24.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.24.0) - 2025-10-29

### Added
- Add Infravision detection mode that highlights living creatures with red glow (excludes constructs, undead, objects, petrified, and defeated creatures)
- Add Low-Light Vision mode with configurable dim light multiplier and optional grayscale
- Add vision-5e compatibility to support Low-Light Vision alongside vision-5e's automated detection modes
- Add Levels integration to filter region visibility by current elevation

## [1.23.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.23.0) - 2025-10-22

### Added
- Add Blood Pool tracking meter to character sheets for Severed Lands Blood Magic
- Add click-to-edit inline editing for Blood Pool meter
- Add Blood Vial equipment item for storing blood
- Add blood vial decay mechanic (halves stored blood on long rest)
- Add Wild Shape support for Blood Magic (blood vials merge into beast form with 2x capacity)
- Add Wild Shape and Blood Magic house rule documentation

### Fixed
- Fix Breather button being triggered by Enter key presses anywhere on the sheet
- Fix flag namespaces to use correct module ID (migrate old flags automatically on sheet load)

## [1.22.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.22.1) - 2025-10-22

### Fixed
- Fix kobold avatar and token image paths to use public directory

## [1.22.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.22.0) - 2025-10-22

### Added
- Add Kobold Dragonshield monster (CR 1)
- Add Kobold Inventor monster with 8 weapon inventions (CR 1/4)
- Add Kobold Scale Sorcerer monster with innate spellcasting (CR 1)

## [1.21.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.21.0) - 2025-10-21

### Added
- Add Beast Form (B) spell component for casting spells while Wild Shaped
- Add 12 Beast Form spells for druids: Battering Claws, Grasping Claws, Latch On (1st); Feral Mauling, Hungry for the Kill, Mighty Roar (2nd); Ambush, Primal Ravage, Rending Claws (3rd); Relentless Pursuit, Scatter the Herd (4th); Savage Takedown (5th)
- Add Beast Form Spells documentation to House Rules journal

## [1.20.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.20.1) - 2025-10-18

### Fixed
- Fix spell icons to use proper icon paths

## [1.20.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.20.0) - 2025-10-18

### Added
- Add Talents accordion to Argon Combat HUD
- Add Wild Talent origin feat
- Add Wilder background
- Add Clue divination spell
- Add Disguised Blast illusion spell
- Add Gore Spike blood necromancy cantrip
- Add Hemokinesis blood transmutation cantrip
- Add Sanguine Wave blood necromancy spell
- Add Shadow Lance illusion cantrip

### Changed
- Consolidate psionic utility functions
- Update psionic spell identification

## [1.19.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.19.0) - 2025-10-16

### Added
- Add Order of the Awakened psionicist subclass
- Add Order of the Immortal psionicist subclass
- Add Order of the Nomad psionicist subclass
- Add Order of the Soul Knife psionicist subclass
- Add Order of the Wu Jen psionicist subclass
- Add Argon Combat HUD integration for psionic powers
- Add power point display in Argon HUD
- Add Power Limit filtering for psionic powers
- Add Psionicist Manifesting card to character sheet
- Add Thiraxi playable species
- Add extract_pack.mjs tool

### Fixed
- Update psionic discipline icons for consistency
- Update Call to InAction to apply prone condition
- Update Charming Presence mechanics
- Update Grasp escape mechanic
- Update Mend Wounds healing
- Remove disease removal from Restore Health
- Fix psionic power point costs display
- Fix power point extraction
- Add error handling for locked databases

### Changed
- Add scaling to Dolorous Mind power
- Enforce curly braces ESLint rule
- Migrate psionic subtitle UI to native DOM
- Convert species images to WebP format
- Rename Thanoi folder

## [1.18.5](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.5) - 2025-10-02

### Fixed
- Correct psionic discipline folder organization

## [1.18.4](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.4) - 2025-10-02

### Added
- Organize psionic disciplines into folders

### Changed
- Rename fire-related psionic files

## [1.18.3](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.3) - 2025-10-02

### Fixed
- Replace invalid psionic power icons

## [1.18.2](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.2) - 2025-10-02

### Fixed
- Correct Avatar discipline subtype

## [1.18.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.1) - 2025-10-02

### Fixed
- Add missing psionic powers
- Fix Hail of Crystals description

## [1.18.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.0) - 2025-10-02

### Added
- Add psionic disciplines and spells
- Add document ID generation tool

## [1.17.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.17.0) - 2025-09-27

### Added
- Add Necromancer wizard subclass
- Add Enchanter wizard subclass

## [1.16.4](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.4) - 2025-09-26

### Fixed
- Improve container drag-drop for Location actors
- Add support for drops from external sources

## [1.16.3](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.3) - 2025-09-26

### Fixed
- Fix delete confirmation in Location sheets
- Fix duplicate items in Location sheets

## [1.16.2](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.2) - 2025-09-26

### Added
- Enable container functionality for Location sheets

### Fixed
- Fix item duplication in containers
- Hide items inside containers
- Add container drop interception
- Handle recursive container prevention

## [1.16.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.1) - 2025-09-26

### Fixed
- Fix Location sheet theme support

## [1.16.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/1.16.0) - 2025-09-26

### Added
- Add Severed Lands Blood Magic automation
- Add Blood Magic chat integration
- Add spell level tracking for Blood Magic
- Add badges to README
- Add Location actor subtype
- Add Location sheet inventory and currency system
- Add Location sheet context menus
- Add Location sheet expand/collapse functionality
- Add container support for Location sheets
- Add item dragging to Location sheets
- Add Create Item functionality to Location sheets
- Add ItemListControls component
- Add group/ungroup toggle to Location sheet
- Add portrait popup to Location sheet
- Add net worth display to Location sheets
- Limit Imperiled condition to NPCs with linked tokens

### Changed
- Reorganize stylesheet architecture
- Implement centralized logging
- Migrate Blood Magic to Handlebars templates
- Standardize module ID usage
- Extract LocationSheet into manager architecture
- Apply Beautiful Coding standards to location feature
- Migrate Location currency to dynamic MappingField system
- Remove Features and Details tabs from Location sheet
- Migrate location feature to Handlebars templates
- Move item-list-controls to components directory
- Update .gitignore

### Fixed
- Fix spell slot consumption detection for Blood Magic
- Fix Blood Magic chat message persistence
- Fix natural 1 detection for advantage/disadvantage rolls
- Correct README content
- Correct localization keys
- Fix Location sheet tab functionality
- Fix consumable drag/drop errors
- Fix consumable subtitle generation
- Fix item uses display
- Fix item drop issues and overflow handling
- Improve Location sheet scrolling
- Fix item subtitle formatting in Location sheets
- Remove standard-form class from Location sheets
- Change Location sheet portrait to square
- Fix Location Type field validation
- Change container click behavior
