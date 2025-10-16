# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Add Argon Combat HUD integration for psionic powers with separate "Manifest Power" button, power point costs display, and discipline-based grouping
- Display actual power point pool (e.g., "6/84 power points") in Argon Combat HUD discipline groups instead of individual slot boxes
- Filter psionic powers based on character's Power Limit in both Spellbook UI and Argon Combat HUD, hiding powers with minimum power point costs exceeding the current limit
- Add Psionicist Manifesting card to character sheet spellbook displaying Power Limit, ability modifier, attack bonus, and save DC
- Add Thiraxi playable species
- Add extract_pack.mjs tool for extracting arbitrary LevelDB packs to YAML format

### Fixed
- Fix psionic power point costs not displaying on character sheet spell subtitles by using correct v4 sheet hooks (renderActorSheet5eCharacter2/renderActorSheet5eNPC2)
- Correct power point extraction to check character's spell-points item instead of compendium reference
- Add proper error handling for locked LevelDB databases in pack extraction/compilation tools

### Changed
- Enforce curly braces for all control structures with new ESLint rule
- Migrate psionic subtitle UI from jQuery to native DOM APIs
- Convert species images to WebP format for improved file size (Thiraxi, Minotaur)
- Rename Thanoi folder to "Thanoi Features" for consistency with other species folders

## [1.18.5](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.5) - 2025-10-02

### Fixed
- Correct psionic discipline folder organization

## [1.18.4](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.4) - 2025-10-02

### Added
- Organize psionic disciplines into folders

### Changed
- Rename fire-related psionic files to follow underscore naming convention

## [1.18.3](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.3) - 2025-10-02

### Fixed
- Replace invalid psionic power icons with valid Foundry assets across all 141 psionic documents

## [1.18.2](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.2) - 2025-10-02

### Fixed
- Correct Avatar discipline subtype from 'avt' to 'ava' for all 10 Avatar disciplines

## [1.18.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.1) - 2025-10-02

### Fixed
- Add missing psionic powers from OCR (Mantle of Joy: Comforting Aura, Aura of Jubilation, Beacon of Recovery; Alacrity: Death from Above)
- Fix Hail of Crystals description to include missing difficult terrain effect

## [1.18.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.18.0) - 2025-10-02

### Added
- Add comprehensive psionic disciplines and spells across multiple specializations (Avatar, Awakened, Immortal, Nomad, Soul Knife, Wu Jen)
- Add document ID generation tool for content management

## [1.17.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.17.0) - 2025-09-27

### Added
- Add Necromancer wizard subclass from 2024 PHB with features: Necromancy Savant, Necromancy Spellbook, Undead Thralls, Harvest Undead, Grave Power, Death's Master
- Add Enchanter wizard subclass from 2024 PHB with features: Enchantment Savant, Hypnotic Presence, Enchanting Conversationalist, Instinctive Charm, Alter Memories, Split Enchantment

## [1.16.4](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.4) - 2025-09-26

### Fixed
- Improve container drag-drop for Location actors with better drop target detection using elementFromPoint fallback
- Add support for drops from external sources (compendiums, other actors) into container sheets

## [1.16.3](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.3) - 2025-09-26

### Fixed
- Fix delete confirmation dialog to properly await user response before deletion in Location sheets
- Fix duplicate items appearing when dragging consumables from external sources to Location sheets

## [1.16.2](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.2) - 2025-09-26

### Added
- Enable container functionality for Location sheets

### Fixed
- Fix item duplication when dragging into containers on Location sheets
- Properly hide items inside containers from main inventory display
- Add hook to intercept container drops for Location actors
- Handle recursive container prevention

## [1.16.1](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/v1.16.1) - 2025-09-26

### Fixed
- Fix Location sheet theme support so custom light backgrounds properly allow system dark mode styles to take precedence

## [1.16.0](https://github.com/nivthefox/foundryvtt-sosly-5e-house-rules/releases/tag/1.16.0) - 2025-09-26

### Added
- Implement Severed Lands Blood Magic automation with madness saves, blood surge (natural 20 refunds spell slots), and hungry magic (natural 1 consumes slots/deals damage)
- Add chat integration for Blood Magic with styled chat cards for GM madness effect selection
- Add spell level tracking for Blood Magic madness effects with combat turn save re-attempts
- Add comprehensive badge collection to README
- Add location actor subtype with basic functionality including currency tracking, inventory management, location features, rich text descriptions, and tabbed interface
- Complete D&D 5e visual integration for location sheet with vertical tabs and parchment background
- Complete D&D 5e integration with edit/play modes for location sheet
- Implement comprehensive inventory and currency system for location sheet with categorized sections and interactive coin interface
- Implement proper D&D 5e context menu system for location sheet items using ContextMenu5e
- Implement comprehensive expand/collapse functionality for location sheet items with dynamic icon switching
- Implement proper container support with capacity display and contents management
- Implement item dragging and triple-dot context menu functionality for location sheets
- Implement Create Item functionality for Location sheets with context-aware item type filtering
- Extract search/filter/sort to reusable ItemListControls component
- Add group/ungroup toggle functionality to Location sheet
- Add portrait popup to Location sheet (clickable in Play mode)
- Add net worth display to Location sheets
- Limit Imperiled condition to NPCs with linked tokens to prevent notification spam

### Changed
- Reorganize stylesheet architecture to match JavaScript structure, splitting monolithic SCSS into modular components
- Implement centralized logging and clean up build configuration, replacing console.log statements with branded logger utility
- Migrate inline HTML to Handlebars templates for Blood Magic
- Standardize module ID usage across all JavaScript files using imported module_id constant
- Apply D&D 5e styling to location sheet
- Extract LocationSheet into manager architecture (80% reduction in main sheet complexity with separate managers for items, data preparation, and UI manipulation)
- Apply Beautiful Coding standards to location feature
- Migrate Location currency to dynamic MappingField system to support dynamic currencies from modules and campaign settings
- Remove Features and Details tabs from Location sheet to focus on inventory management
- Migrate inline HTML to Handlebars templates across location feature
- Move item-list-controls from shared/ to components/ directory
- Update .gitignore to properly exclude IDE configuration files

### Fixed
- Correct spell slot consumption detection for Blood Magic to check nested updates object structure
- Resolve Blood Magic chat message persistence by updating chat message content when effects applied
- Fix natural 1 detection bug for advantage/disadvantage rolls (checks active die instead of first die)
- Correct README.md content to match SoSly House Rules module
- Correct localization keys from SOSLY to sosly (lowercase) and remove redundant size field
- Implement proper D&D 5e tab functionality for location sheet
- Resolve consumable drag/drop errors with comprehensive error handling in item context preparation
- Fix consumable subtitle generation with proper type validation and fallbacks
- Correct item uses display to show full charges for new items (1/1 vs 0/1)
- Resolve item drop issues and improve sheet overflow handling with proper scrollable tabs
- Improve Location sheet scrolling and layout structure
- Use proper item subtitle formatting in Location sheets (fixes raw i18n keys appearing)
- Remove standard-form class and add header padding to Location sheets
- Change Location sheet portrait from circular to square
- Resolve Location Type field validation with phantom comma
- Change container click behavior to open item sheet instead of using container
