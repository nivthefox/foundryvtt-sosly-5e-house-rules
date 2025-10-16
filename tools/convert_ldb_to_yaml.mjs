import {extractPack} from './extract_pack.mjs';
import {promises as fs} from 'fs';
import path from 'path';

const MODULE_ID = process.cwd();

const packs = await fs.readdir('./packs');
for (const pack of packs) {
    if (pack === '.gitattributes') {
        continue;
    }

    console.log('Unpacking ' + pack);

    const sourcePack = path.join(MODULE_ID, 'packs', pack);
    const outputDir = path.join(MODULE_ID, 'src', 'packs', pack);

    try {
        await extractPack(sourcePack, outputDir);
    } catch (error) {
        if (error.code === 'LEVEL_LOCKED') {
            console.error(`\nERROR: Failed to unpack ${pack}`);
            console.error(error.message);
            process.exit(1);
        }
        throw error;
    }
}
