# Foundry v13 and dnd5e 5.1 Migration Findings

These findings document the defects discovered while reviewing the module's migration from Foundry v12 to Foundry v13 and dnd5e 5.1. Each finding is intentionally self-contained so it can be handed to another coding agent as an independent task.

The findings distinguish retained-memory leaks from allocation pressure and ordinary correctness defects. An agent should not claim that a finding fixes the reported memory growth unless its verification demonstrates the relevant lifetime behavior.

## Tracking

The first checkbox tracks independent verification that the reported issue is real and correctly characterized. The second checkbox tracks completion of the repair and its required acceptance criteria and live validation.

- [x] Verify · [x] Repair · [F-01: Location sheet accumulates ContextMenu listeners](F-01-location-context-menu-listener-leak.md)—Every Location-sheet rerender attaches another ContextMenu listener to its persistent ApplicationV2 root and retains the associated sheet objects.
- [x] Verify · [x] Repair · [F-02: Some pack Items retain unresolved dnd5e migration markers](F-02-compendium-sources-not-migrated.md)—Thirty-five top-level or embedded Items retain transient migration flags; eight have unresolved property mismatches, and three activated spells have no reviewed activity.
- [x] Verify · [x] Repair · [F-03: Low-light vision performs excessive polygon allocation](F-03-low-light-vision-allocation-churn.md)—Every low-light vision-source rebuild recreates Clipper geometry for every active light, producing avoidable CPU work and allocation pressure.
- [x] Verify · [x] Repair · [F-04: Low-light vision retains and reuses a stale polygon](F-04-low-light-vision-stale-polygon.md)—A low-light vision source can retain and return an obsolete extended polygon after the lights that produced it no longer apply.
- [x] Verify · [x] Repair · [F-05: Breather button injection is not idempotent](F-05-breather-render-not-idempotent.md)—Repeated render-hook invocation against a surviving sheet header adds duplicate Breather buttons and click listeners.
- [x] Verify · [x] Repair · [F-06: Madness meter injection is not idempotent](F-06-madness-meter-render-not-idempotent.md)—Repeated render-hook invocation against a surviving sidebar adds duplicate Madness meters and handler sets.
- [x] Verify · [x] Repair · [F-07: Net-worth injection is not idempotent](F-07-net-worth-render-not-idempotent.md)—Live testing confirmed that 20 same-root hook calls produce 21 displays on character, NPC, and Location sheets, with stale values possible between renders.
- [x] Verify · [x] Repair · [F-08: Blood-pool meter injection is not idempotent](F-08-blood-pool-meter-render-not-idempotent.md)—Repeated render-hook invocation against a surviving sidebar adds duplicate Blood Pool meters and editable handler sets.
- [x] Verify · [x] Repair · [F-09: Psionic manifesting card does not match the current spellbook DOM](F-09-psionic-manifesting-card-render-not-idempotent.md)—The live character and NPC hooks never insert a card because `.spells .top` does not match the current dnd5e spellbook; the former duplication and wrong-button behavior remains latent behind that selector defect.
- [x] Verify · [x] Repair · [F-10: Psionic discipline organization targets the wrong tab and accumulates on re-entry](F-10-psionic-discipline-section-render-not-idempotent.md)—A stale dnd5e selector moves discipline rows into the hidden Effects part; partial renders then accumulate sections or duplicate Item rows.
- [x] Verify · [x] Repair · [F-11: Psionic spell subtitle integration does not match the current dnd5e spellbook](F-11-psionic-subtitle-render-not-idempotent.md)—Current dnd5e rows no longer match the subtitle callback's selectors, so cost annotations and power-limit filtering do not run.
- [x] Verify · [ ] Repair · [F-12: Infravision registers a hook that dnd5e does not emit](F-12-infravision-uses-nonexistent-hook.md)—Live GM and Player2 testing confirmed that the Actor callback never runs; Token-owned Infravision detection works independently through Foundry's canvas pipeline.
- [x] Verify · [ ] Repair · [F-13: Encumbrance registers an inert item update hook](F-13-encumbrance-uses-wrong-update-path.md)—The registered callback's guard checks the wrong path; Foundry has already re-prepared the parent Actor before the hook runs, and its direct Actor method call would not recalculate encumbrance.
- [x] Verify · [ ] Repair · [F-14: Location registers an unused unqualified actor type-label alias](F-14-location-type-label-not-namespaced.md)—Foundry v13 already generates and localizes the required namespaced label; the module's extra unqualified entry is unused today but could collide with a future system-owned Location subtype.
- [x] Verify · [ ] Repair · [F-15: Argon prototype wrappers are non-idempotent under unsupported re-entry](F-15-argon-prototype-wrappers-can-stack.md)—Artificially repeated initialization stacks wrappers, but the installed Argon lifecycle initializes once per page load and ordinary HUD operations do not reach the stacking path.
- [x] Verify · [ ] Repair · [F-16: The integration-test environment still runs Foundry v12](F-16-v13-integration-tests-run-on-v12.md)—The documented test environment runs Foundry v12 and CI omits integration tests even though the module requires Foundry v13 and dnd5e 5.1.

## Shared verification boundary

Headless tests can establish source-data invariants, idempotent DOM transforms, and hook behavior. They cannot prove live Foundry rendering, browser heap behavior, canvas performance, module interoperability, or protected runtime behavior. Findings that affect those areas require the live checks described in their acceptance criteria.
