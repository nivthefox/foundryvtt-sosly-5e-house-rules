import {extractPack as foundryExtractPack} from '@foundryvtt/foundryvtt-cli';
import {promises as fs} from 'fs';
import path from 'path';

function transformName(doc) {
    const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, '_');
    const type = doc._key.split('!')[1];
    const prefix = ['actors', 'items'].includes(type) ? doc.type : type;

    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.yml`;
}

export async function extractPack(sourcePack, outputDir) {
    const yaml = true;

    try {
        await fs.mkdir(outputDir, {recursive: true});
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw new Error(`Failed to create output directory: ${error.message}`);
        }
    }

    try {
        const files = await fs.readdir(outputDir);
        for (const file of files) {
            await fs.unlink(path.join(outputDir, file));
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.log('Warning cleaning output directory:', error);
        }
    }

    try {
        await foundryExtractPack(sourcePack, outputDir, {yaml, transformName});
    } catch (error) {
        if (error.code === 'LEVEL_ITERATOR_NOT_OPEN' || error.code === 'LEVEL_LOCKED') {
            const err = new Error('The LevelDB database appears to be locked or in use. Please close FoundryVTT and try again.');
            err.code = 'LEVEL_LOCKED';
            throw err;
        }
        throw error;
    }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    if (process.argv.length < 4) {
        console.error('Usage: node extract_pack.mjs <source-pack-path> <output-directory>');
        console.error('Example: node extract_pack.mjs "../dnd-players-handbook/packs/species" "./temp/phb-species"');
        process.exit(1);
    }

    const sourcePack = path.resolve(process.argv[2]);
    const outputDir = path.resolve(process.argv[3]);

    console.log(`Extracting pack from ${sourcePack} to ${outputDir}`);

    try {
        await extractPack(sourcePack, outputDir);
        console.log('Extraction complete');
    } catch (error) {
        if (error.code === 'LEVEL_LOCKED') {
            console.error('\nERROR: Failed to extract pack');
            console.error(error.message);
            process.exit(1);
        }
        throw error;
    }
}
