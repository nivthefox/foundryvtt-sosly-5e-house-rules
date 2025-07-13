/**
 * Utility functions for FoundryVTT Playwright tests
 */

/**
 * Login to FoundryVTT as Gamemaster
 * @param {import('@playwright/test').Page} page
 */
export async function loginAsGamemaster(page) {
    try {
    // Wait a moment for page to load
        await page.waitForTimeout(1000);

        // Check if we're on the login screen by looking for the join button
        const joinButton = page.locator('button:has-text("Join Game Session")');

        // Wait up to 5 seconds to see if we're on login screen
        if (await joinButton.isVisible({ timeout: 5000 })) {
            console.log('On login screen, attempting to login...');

            // Get all available options and their states
            const userSelect = page.locator('select').first();
            const allOptions = await userSelect.locator('option').evaluateAll(options => {
                return options.map(opt => ({
                    text: opt.textContent.trim(),
                    value: opt.value,
                    disabled: opt.disabled
                }));
            });

            console.log('All user options:', allOptions);

            // Find the first enabled user (skip empty option)
            const enabledUser = allOptions.find(opt => !opt.disabled && opt.text && opt.text !== '');

            if (enabledUser) {
                await userSelect.selectOption(enabledUser.value);
                console.log(`Selected user: ${enabledUser.text}`);
            } else {
                throw new Error('No enabled users found for login');
            }

            // Wait a moment then click join
            await page.waitForTimeout(500);
            await joinButton.click();

            // Wait for login to complete - either redirect or see game loading
            await page.waitForFunction(() => {
                // Check if URL changed (successful login redirects)
                const urlChanged = !window.location.pathname.includes('/join');
                // Or if game object exists (login in progress)
                const gameExists = window.game !== undefined;
                return urlChanged || gameExists;
            }, { timeout: 15000 });

            console.log('Login attempt completed');
        } else {
            console.log('Not on login screen or already logged in');
        }
    } catch (error) {
        console.log('Login error:', error.message);
    // Continue anyway - might already be logged in
    }
}

/**
 * Wait for FoundryVTT to be fully loaded and ready
 * @param {import('@playwright/test').Page} page
 */
export async function waitForFoundryReady(page) {
    console.log('Starting FoundryVTT ready check...');

    // First handle login if needed
    await loginAsGamemaster(page);

    console.log('Waiting for .vtt selector or #game...');
    // Wait for the main FoundryVTT interface (could be .vtt or #game)
    try {
        await page.waitForSelector('.vtt, #game', { timeout: 30000 });
        console.log('Found FoundryVTT interface');
    } catch (e) {
        console.log('Interface selector not found, continuing...');
    }

    console.log('Waiting for game.ready...');
    // Set up a flag that will be set by the ready hook
    await page.evaluate(() => {
        if (!window.foundryReadyFlag) {
            window.foundryReadyFlag = false;
            if (window.game && window.game.ready) {
                window.foundryReadyFlag = true;
            } else if (window.Hooks) {
                window.Hooks.once('ready', () => {
                    window.foundryReadyFlag = true;
                });
            }
        }
    });

    // Wait for the flag to be set
    await page.waitForFunction(() => {
        return window.foundryReadyFlag === true;
    }, { timeout: 60000 });
    console.log('Game is ready');

    console.log('Waiting for module to be active...');
    // Wait for our module to be active
    await page.waitForFunction(() => {
        return window.game.modules.get('sosly-5e-house-rules')?.active;
    }, { timeout: 15000 });
    console.log('Module is active, FoundryVTT is ready!');
}

/**
 * Create a test actor for testing purposes
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Actor name
 * @param {string} type - Actor type (character, npc)
 * @param {Object} customData - Additional actor data
 */
export async function createTestActor(page, name = 'Test Character', type = 'character', customData = {}) {
    return await page.evaluate(async ({ name, type, customData }) => {
    // Base actor data
        const actorData = {
            name,
            type,
            system: {
                attributes: {
                    hp: { value: 20, max: 20 },
                    exhaustion: 0,
                    hd: {
                        d8: { available: 3, spent: 1 },
                        d6: { available: 2, spent: 0 }
                    }
                },
                abilities: {
                    str: { value: 16 },
                    dex: { value: 14 },
                    con: { value: 15 },
                    int: { value: 12 },
                    wis: { value: 13 },
                    cha: { value: 10 }
                },
                details: {
                    level: 5
                }
            }
        };

        // Merge any custom data
        foundry.utils.mergeObject(actorData, customData, { recursive: true });

        const actor = await Actor.create(actorData);
        return actor.id;
    }, { name, type, customData });
}

/**
 * Create a test character with specific classes and levels
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Character name
 * @param {Array} classes - Array of {name, level} objects
 */
export async function createTestCharacterWithClasses(page, name, classes = [{ name: 'Fighter', level: 5 }]) {
    return await page.evaluate(async ({ name, classes }) => {
    // Create the actor first
        const actorData = {
            name,
            type: 'character',
            system: {
                attributes: {
                    hp: { value: 45, max: 50 },
                    exhaustion: 0,
                    hd: {}
                },
                abilities: {
                    str: { value: 16 },
                    dex: { value: 14 },
                    con: { value: 15 },
                    int: { value: 12 },
                    wis: { value: 13 },
                    cha: { value: 10 }
                },
                details: {
                    level: classes.reduce((total, cls) => total + cls.level, 0)
                }
            }
        };

        const actor = await Actor.create(actorData);

        // Add class items
        const classItems = [];
        for (const cls of classes) {
            const hitDie = cls.name === 'Fighter' ? 'd10'
                : cls.name === 'Rogue' ? 'd8'
                    : cls.name === 'Wizard' ? 'd6' : 'd8';

            const classItem = {
                name: cls.name,
                type: 'class',
                system: {
                    levels: cls.level,
                    hd: {
                        denomination: hitDie
                    }
                }
            };

            classItems.push(classItem);

            // Set up hit dice for this class
            actorData.system.attributes.hd[hitDie] = {
                available: Math.floor(cls.level * 0.7), // Some available
                spent: Math.ceil(cls.level * 0.3)       // Some spent
            };
        }

        // Update actor with hit dice
        await actor.update({ 'system.attributes.hd': actorData.system.attributes.hd });

        // Create class items
        await actor.createEmbeddedDocuments('Item', classItems);

        return actor.id;
    }, { name, classes });
}

/**
 * Clean up test actors, items, and other documents
 * @param {import('@playwright/test').Page} page
 */
export async function cleanupTestActors(page) {
    await page.evaluate(async () => {
    // Clean up actors
        const testActors = game.actors?.filter?.(actor =>
            actor.name.startsWith('Test ')
      || actor.name.includes('Playwright')
      || actor.name.startsWith('Breather Test')
        ) || [];

        for (const actor of testActors) {
            try {
                await actor.delete();
            } catch (e) {
                console.warn('Failed to delete test actor:', e);
            }
        }

        // Clean up any test items in the world
        const testItems = game.items?.filter?.(item =>
            item.name.startsWith('Test ')
      || item.name.includes('Playwright')
        ) || [];

        for (const item of testItems) {
            try {
                await item.delete();
            } catch (e) {
                console.warn('Failed to delete test item:', e);
            }
        }

        // Close any open dialogs
        Object.values(ui.windows).forEach(app => {
            if (app.title?.includes('Test') || app.title?.includes('Playwright') || app.title?.includes('Breather')) {
                try {
                    app.close();
                } catch (e) {
                    console.warn('Failed to close test dialog:', e);
                }
            }
        });
    });
}

/**
 * Get module setting value
 * @param {import('@playwright/test').Page} page
 * @param {string} settingKey
 */
export async function getModuleSetting(page, settingKey) {
    return await page.evaluate(key => {
        return game.settings.get('sosly-5e-house-rules', key);
    }, settingKey);
}

/**
 * Set module setting value
 * @param {import('@playwright/test').Page} page
 * @param {string} settingKey
 * @param {any} value
 */
export async function setModuleSetting(page, settingKey, value) {
    return await page.evaluate(async ({ key, val }) => {
        return await game.settings.set('sosly-5e-house-rules', key, val);
    }, { key: settingKey, val: value });
}

/**
 * Import a character using Foundry's import system
 * @param {import('@playwright/test').Page} page
 * @param {string} jsonData - JSON string of actor data
 * @param {string} testName - Optional name prefix for the test character
 */
export async function importTestCharacter(page, jsonData, testName = 'Test') {
    return await page.evaluate(async ({ data, name }) => {
        try {
            // Parse the JSON data
            const actorData = JSON.parse(data);

            // Update the name to include test prefix
            actorData.name = `${name} ${actorData.name}`;

            // Use Foundry's import system
            const imported = await Actor.fromDropData({ type: 'Actor', data: actorData });
            const actor = await Actor.create(imported);

            return actor.id;
        } catch (error) {
            console.error('Failed to import character:', error);
            throw error;
        }
    }, { data: jsonData, name: testName });
}

/**
 * Reduce character's HP for testing purposes
 * @param {import('@playwright/test').Page} page
 * @param {string} actorId
 * @param {number} damage - Amount of damage to deal
 */
export async function damageCharacter(page, actorId, damage) {
    return await page.evaluate(async ({ id, dmg }) => {
        const actor = game.actors.get(id);
        if (!actor) throw new Error(`Actor ${id} not found`);

        const currentHP = actor.system.attributes.hp.value;
        const newHP = Math.max(0, currentHP - dmg);

        await actor.update({
            'system.attributes.hp.value': newHP
        });

        return {
            oldHP: currentHP,
            newHP: newHP,
            damage: dmg
        };
    }, { id: actorId, dmg: damage });
}
