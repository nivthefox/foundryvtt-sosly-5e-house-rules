import { compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';

const MODULE_ID = process.cwd();
const yaml = true;

const packs = await fs.readdir('./src/packs');
for (const pack of packs) {
    if (pack === '.gitattributes') continue;
    console.log('Packing ' + pack);
    try {
        await compilePack(
            `${MODULE_ID}/src/packs/${pack}`,
            `${MODULE_ID}/packs/${pack}`,
            { yaml }
        );
    } catch (error) {
        if (error.code === 'LEVEL_ITERATOR_NOT_OPEN' || error.code === 'LEVEL_LOCKED') {
            console.error(`\nERROR: Failed to pack ${pack}`);
            console.error('The LevelDB database appears to be locked or in use.');
            console.error('Please close FoundryVTT and try again.\n');
            process.exit(1);
        }
        throw error;
    }
}
