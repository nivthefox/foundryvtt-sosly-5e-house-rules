import {id as MODULE_ID} from '../../../module.json';

export function getBreatherDeltas(actor) {
    return actor.getFlag(MODULE_ID, 'breatherDeltas');
}

export async function clearBreatherDeltas(actor) {
    await actor.unsetFlag(MODULE_ID, 'breatherDeltas');
}

export async function addBreatherDelta(actor, keyPath, delta, itemId = null) {
    const deltas = getBreatherDeltas(actor);
    if (!deltas) {
        return;
    }

    if (itemId) {
        if (!deltas.item[itemId]) {
            deltas.item[itemId] = [];
        }
        const existing = deltas.item[itemId].find(d => d.keyPath === keyPath);
        if (existing) {
            existing.delta += delta;
        } else {
            deltas.item[itemId].push({ keyPath, delta });
        }
    } else {
        const existing = deltas.actor.find(d => d.keyPath === keyPath);
        if (existing) {
            existing.delta += delta;
        } else {
            deltas.actor.push({ keyPath, delta });
        }
    }

    await actor.setFlag(MODULE_ID, 'breatherDeltas', deltas);
}
