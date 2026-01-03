/**
 * Migration script for ElevationRuler movement penalty regions.
 * Converts elevationruler.movementPenalty behaviors to Foundry v13's native modifyMovementCost.
 *
 * This script registers a shim so the old type passes validation, then works with
 * _source data directly to avoid re-initialization overhead.
 *
 * Usage: Copy this entire script into the browser console and press Enter.
 */
(async function migrateElevationRulerRegions() {
  const OLD_TYPE = "elevationruler.movementPenalty";
  const NEW_TYPE = "modifyMovementCost";

  console.log("Registering legacy behavior type shim...");

  // Register in game.model so the type passes DocumentTypeField validation
  if (!game.model.RegionBehavior) game.model.RegionBehavior = {};
  game.model.RegionBehavior[OLD_TYPE] = {};

  let totalMigrated = 0;
  let totalDeleted = 0;

  function clamp(value, min, max) {
    if (value == null) {
      return 1;
    }
    return Math.min(Math.max(value, min), max);
  }

  for (const scene of game.scenes) {
    const regionsSource = scene._source.regions;
    if (!regionsSource?.length) {
      continue;
    }

    let sceneNeedsUpdate = false;
    const updatedRegions = [];

    for (const regionSource of regionsSource) {
      const oldBehaviors = regionSource.behaviors?.filter(b => b.type === OLD_TYPE) ?? [];

      if (!oldBehaviors.length) {
        updatedRegions.push(regionSource);
        continue;
      }

      console.log(`Processing region "${regionSource.name}" in scene "${scene.name}"...`);
      sceneNeedsUpdate = true;

      const newBehaviors = regionSource.behaviors.filter(b => b.type !== OLD_TYPE);

      for (const old of oldBehaviors) {
        const difficulties = {
          walk: clamp(old.system?.walkMultiplier, 0, 5),
          fly: clamp(old.system?.flyMultiplier, 0, 5),
          swim: clamp(old.system?.swimMultiplier, 0, 5),
          burrow: clamp(old.system?.burrowMultiplier, 0, 5)
        };

        const hasNonDefault = Object.values(difficulties).some(v => v !== 1);
        if (!hasNonDefault) {
          console.log(`  Deleting behavior "${old.name || old._id}" - all values are default (1)`);
          totalDeleted++;
          continue;
        }

        newBehaviors.push({
          _id: foundry.utils.randomID(),
          type: NEW_TYPE,
          name: old.name || "Movement Cost",
          system: { difficulties },
          disabled: old.disabled ?? false
        });

        console.log(`  Migrated behavior "${old.name || old._id}": walk=${difficulties.walk}, fly=${difficulties.fly}, swim=${difficulties.swim}, burrow=${difficulties.burrow}`);
        totalMigrated++;
      }

      updatedRegions.push({
        ...regionSource,
        behaviors: newBehaviors
      });
    }

    if (sceneNeedsUpdate) {
      console.log(`  Updating scene "${scene.name}"...`);
      await scene.update({ regions: updatedRegions });
      console.log(`  Done.`);
    }
  }

  // Clean up the shim
  delete game.model.RegionBehavior[OLD_TYPE];

  console.log(`Migration complete. Migrated: ${totalMigrated}, Deleted (default values): ${totalDeleted}`);
  console.log("Reload the page to verify the errors are gone.");
})();
