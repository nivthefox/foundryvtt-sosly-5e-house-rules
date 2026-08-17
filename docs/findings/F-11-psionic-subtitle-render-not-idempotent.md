# F-11: Psionic Spell Subtitle Integration Does Not Match the Current dnd5e Spellbook

## Classification

This is a verified current compatibility failure. The original repeated-text mutation still exists in the callback, but current dnd5e actor sheets do not reach that behavior because the callback selects attributes that are no longer present.

## Problem

`addPsionicSubtitles` selects rows with `[data-item-level="99"]` and `[data-item-level="0"]`. dnd5e 5.2.5 puts `data-level` and `data-method` on the spellbook section, while individual spell rows have `data-item-id` and grouping data but no `data-item-level`. The callback therefore finds zero rows, adds no power-point annotation, and performs no power-limit filtering.

The old non-idempotent append behavior remains dormant. When live test instrumentation artificially added `data-item-level="99"` to a current row, five hook invocations changed `Reaction` into `Reaction • 1-3 Power Points` repeated five times. A changed cost appended a second annotation, and removing all costs left the obsolete annotation in place. Those results describe what will happen after the selector is repaired unless annotation ownership is repaired at the same time; they are not the current unmodified runtime symptom.

## Evidence

`src/features/psionics/psionics.js` registers the psionic spellcasting configuration before dnd5e initializes its spellcasting models and attaches `addPsionicSubtitles` to both character and NPC render hooks. `src/features/psionics/ui-spellbook.js` queries the obsolete row attributes, then reads the subtitle's current text and appends a new suffix without identifying a prior module-owned annotation.

dnd5e 5.2.5 converts configuration entries into `SpellcastingModel` instances during `i18nInit`. The live `psionic` entry exposes `getLabel()`, and its current inventory template places `data-item-id` on each item row while spell level and method are section data rather than row data.

Live validation used Foundry 13.350, dnd5e 5.2.5, and module 13.3.2. Character, NPC, GM, and Player2 renders opened without new console errors and found the psionic row and its subtitle by item ID, but found zero `[data-item-level="99"]` rows and displayed zero power-point annotations. Full and `spells`-part renders replaced the spell row and remained unannotated. No compatibility shim was used.

## Required outcome

Every visible psionic power or talent row must show its current power-point cost exactly once, and power-limit filtering must operate on the current spellbook DOM and document data.

## Constraints

- Preserve the current early spellcasting registration, which dnd5e converts into a spellcasting model during `i18nInit`.
- Identify psionic rows from their item documents or current stable row attributes; do not depend on the removed `data-item-level` row attribute.
- Preserve any dnd5e-provided base subtitle.
- Give the module-owned cost annotation an identity that can be updated or removed without parsing arbitrary localized prose.
- Powers above the Actor's power limit must continue to be hidden.
- Character and NPC spellbooks must remain supported for GMs and owning players.
- Non-psionic spells must remain untouched.

## Acceptance criteria

1. Character and NPC sheets containing a psionic power open without console errors in Foundry 13 and the supported dnd5e version.
2. A current dnd5e spellbook row for a psionic power or talent displays its calculated power-point cost exactly once.
3. At least 20 repeated hook invocations against a surviving row, a forced full render, and a `spells`-part render each leave exactly one current annotation.
4. Changing the activity consumption cost replaces the displayed annotation with the new value or range.
5. Removing all applicable power-point consumption removes the obsolete annotation while preserving the base subtitle.
6. Non-psionic rows remain byte-for-byte unchanged, and power-limit filtering remains correct.
7. Regression tests cover spellcasting registration, current selector compatibility, character and NPC sheets, GM and owning-player visibility, repeated invocation, changed costs, no-cost transitions, and preservation of a nonempty base subtitle.

## Live verification

Repeat the GM and Player2 character/NPC probes without a compatibility shim after repair. Confirm clean full and `spells`-part renders, one annotation per psionic row, current annotations after cost changes or removal, unchanged ordinary spells, and correct power-limit hiding.
