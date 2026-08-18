import {chromium} from '@playwright/test';

import {assertRuntime, EXPECTED_RUNTIME} from '../src/testing/runtime.js';

const BASE_URL = process.env.FOUNDRY_TEST_URL ?? 'http://localhost:30000';
const ADMIN_KEY = process.env.FOUNDRY_ADMIN_KEY ?? 'sosly-integration';
const WORLD_ID = 'sosly-integration';
const WORLD_TITLE = 'SoSly Integration Tests';
const PLAYER_NAME = 'Player2';

const PACKAGES = [
    {
        type: 'system',
        id: 'dnd5e',
        version: EXPECTED_RUNTIME.systemVersion,
        manifest: 'https://github.com/foundryvtt/dnd5e/releases/download/release-5.2.5/system.json'
    },
    {
        type: 'module',
        id: 'socketlib',
        version: 'v1.1.3',
        manifest: 'https://github.com/farling42/foundryvtt-socketlib/releases/download/v1.1.3/module.json'
    },
    {
        type: 'module',
        id: 'lib-wrapper',
        version: '1.13.4.0',
        manifest: 'https://github.com/ruipin/fvtt-lib-wrapper/releases/download/v1.13.4.0/module.json'
    },
    {
        type: 'module',
        id: 'ActiveAuras',
        version: '0.12.4',
        manifest: 'https://github.com/kandashi/Active-Auras/releases/download/0.12.4/module.json'
    },
    {
        type: 'module',
        id: 'dnd5e-spellpoints',
        version: '3.2.20',
        manifest: 'https://github.com/misthero/dnd5e-spellpoints/releases/download/v3.2.20/module.json'
    }
];

const ACTIVE_MODULES = PACKAGES
    .filter(pkg => pkg.type === 'module')
    .map(pkg => pkg.id)
    .concat(EXPECTED_RUNTIME.moduleId);

async function authenticateSetup(page) {
    await page.goto(`${BASE_URL}/setup`);

    if (page.url().includes('/license')) {
        await acceptEula(page);
    }

    if (page.url().includes('/auth')) {
        await page.locator('input[name="adminPassword"]').fill(ADMIN_KEY);
        await page.locator('button[value="adminAuth"]').click();
    }

    await page.waitForURL('**/setup', {timeout: 30000});
    await page.waitForFunction(() => {
        return window.game?.view === 'setup'
            && window.game.systems
            && window.game.modules
            && window.game.worlds;
    }, null, {timeout: 30000});
}

async function acceptEula(page) {
    const licenseKeyInput = page.locator('input[name="licenseKey"]');
    if (await licenseKeyInput.isVisible()) {
        throw new Error('Foundry did not receive a license from the configured environment.');
    }

    await page.locator('#eula-agree').check();
    await page.locator('#sign').click();
    await page.waitForLoadState('domcontentloaded');
}

async function installPackage(page, pkg) {
    const installedVersion = await page.evaluate(({id, type}) => {
        const packages = type === 'system' ? game.systems : game.modules;
        return packages.get(id)?.version;
    }, pkg);

    if (installedVersion === pkg.version) {
        return;
    }

    const actualVersion = await page.evaluate(async packageData => {
        const installed = await game.installPackage({
            type: packageData.type,
            manifest: packageData.manifest,
            notify: false,
            force: true
        });
        return installed.version;
    }, pkg);

    if (actualVersion !== pkg.version) {
        throw new Error(`Installed ${pkg.id} ${actualVersion}; expected ${pkg.version}.`);
    }
}

async function createWorld(page) {
    const worldExists = await page.evaluate(worldId => game.worlds.has(worldId), WORLD_ID);
    if (worldExists) {
        return;
    }

    await page.evaluate(async world => {
        const response = await foundry.utils.fetchJsonWithTimeout(foundry.utils.getRoute('setup'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'createWorld',
                id: world.id,
                title: world.title,
                system: world.system
            })
        });

        if (response.error) {
            throw new Error(response.error);
        }
    }, {
        id: WORLD_ID,
        title: WORLD_TITLE,
        system: EXPECTED_RUNTIME.systemId
    });

    await page.reload();
    await page.waitForFunction(worldId => window.game?.worlds?.has(worldId), WORLD_ID, {timeout: 30000});
}

async function launchWorld(page) {
    const launchButton = page.locator(
        `[data-package-id="${WORLD_ID}"] [data-action="worldLaunch"]`
    );
    await launchButton.waitFor({state: 'attached', timeout: 30000});
    await launchButton.evaluate(element => element.click());
    await page.waitForURL('**/join', {timeout: 120000});
}

async function loginGamemaster(page) {
    await page.locator('select[name="userid"]').selectOption({label: 'Gamemaster'});
    await page.locator('button[name="join"]').click();
    await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 120000});
}

async function configureWorld(page) {
    await page.evaluate(async ({activeModules, playerName}) => {
        if (!game.users.find(user => user.name === playerName)) {
            await User.create({
                name: playerName,
                role: CONST.USER_ROLES.PLAYER
            });
        }

        const moduleConfiguration = foundry.utils.deepClone(
            game.settings.get('core', 'moduleConfiguration')
        );
        for (const moduleId of activeModules) {
            moduleConfiguration[moduleId] = true;
        }
        await game.settings.set('core', 'moduleConfiguration', moduleConfiguration);
    }, {
        activeModules: ACTIVE_MODULES,
        playerName: PLAYER_NAME
    });

    await page.reload();
    await page.waitForFunction(moduleId => {
        return window.game?.ready && window.game.modules.get(moduleId)?.active;
    }, EXPECTED_RUNTIME.moduleId, {timeout: 120000});

    await page.evaluate(async moduleId => {
        await game.settings.set(moduleId, 'location.enabled', true);
    }, EXPECTED_RUNTIME.moduleId);
    await page.reload();
    await page.waitForFunction(locationType => {
        return window.game?.ready && CONFIG.Actor.dataModels[locationType];
    }, `${EXPECTED_RUNTIME.moduleId}.location`, {timeout: 120000});
}

async function readRuntime(page) {
    return page.evaluate(moduleId => ({
        coreVersion: game.version,
        systemId: game.system.id,
        systemVersion: game.system.version,
        moduleId: game.modules.get(moduleId)?.id,
        moduleActive: game.modules.get(moduleId)?.active
    }), EXPECTED_RUNTIME.moduleId);
}

async function main() {
    const launchOptions = {headless: true};
    if (process.env.PLAYWRIGHT_CHANNEL) {
        launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
    }

    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({baseURL: BASE_URL});
    const page = await context.newPage();

    try {
        await authenticateSetup(page);
        for (const pkg of PACKAGES) {
            await installPackage(page, pkg);
        }
        await createWorld(page);
        await launchWorld(page);
        await loginGamemaster(page);
        await configureWorld(page);
        assertRuntime(await readRuntime(page));
    } finally {
        await browser.close();
    }
}

await main();
