import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadAll } from 'js-yaml';

const PACK_SOURCE = path.resolve('src/packs');
const TRANSIENT_FLAGS = [
    'persistSourceMigration',
    'migratedProperties',
    'migratedUses'
];

const yamlFiles = await findYamlFiles(PACK_SOURCE);
const failures = [];
let itemCount = 0;

for (const file of yamlFiles) {
    const documents = [];
    loadAll(await fs.readFile(file, 'utf8'), document => documents.push(document));

    for (const document of documents) {
        for (const item of getItems(document)) {
            itemCount += 1;
            auditItem(item, file, document);
        }
    }
}

if (failures.length > 0) {
    console.error(`Pack migration audit failed with ${failures.length} problem(s):`);
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Pack migration audit passed for ${itemCount} Items in ${yamlFiles.length} YAML files.`);
}

async function findYamlFiles(directory) {
    const files = [];

    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findYamlFiles(entryPath));
            continue;
        }
        if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
            files.push(entryPath);
        }
    }

    return files.sort();
}

function getItems(document) {
    if (!document || typeof document !== 'object') {
        return [];
    }

    const documentKey = String(document._key ?? '');
    if (documentKey.startsWith('!items!')) {
        return [document];
    }
    if (documentKey.startsWith('!actors!')) {
        return document.items ?? [];
    }

    return [];
}

function auditItem(item, file, parent) {
    const location = formatLocation(item, file, parent);
    const dnd5eFlags = item.flags?.dnd5e ?? {};

    for (const flag of TRANSIENT_FLAGS) {
        if (Object.hasOwn(dnd5eFlags, flag)) {
            failures.push(`${location} retains flags.dnd5e.${flag}`);
        }
    }

    const activationType = item.system?.activation?.type;
    const activities = item.system?.activities ?? {};
    if (item.type === 'spell' && activationType && Object.keys(activities).length === 0) {
        failures.push(`${location} has ${activationType} activation without an activity`);
    }
}

function formatLocation(item, file, parent) {
    const relativeFile = path.relative(PACK_SOURCE, file).replaceAll(path.sep, '/');
    const parentName = String(parent?._key ?? '').startsWith('!actors!') ? ` in ${parent.name}` : '';
    return `${relativeFile}: ${item.name} (${item._id})${parentName}`;
}
