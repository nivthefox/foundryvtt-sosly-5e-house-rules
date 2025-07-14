/**
 * Utility functions for FoundryVTT Playwright tests
 */

import {expect} from '@playwright/test';

/**
 * Clean up all chat messages in the FoundryVTT game
 * @param page
 * @returns {Promise<void>}
 */
export async function cleanupChatMessages(page) {
    await page.evaluate(async () => {
        // Clear all chat messages
        const chatMessages = game?.messages.contents;
        for (const message of chatMessages) {
            await message.delete();
        }
    });
}

/**
 * Clean up test actors (must contain 'Playwright' in name)
 * @param {import('@playwright/test').Page} page
 */
export async function cleanupTestActors(page) {
    await page.evaluate(async () => {
        const testActors = game?.actors.filter(actor => actor.name.includes('Playwright '));
        for (const actor of testActors) {
            await actor.delete();
        }
    });
}

/**
 * Create a test actor for testing purposes
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Actor name (will be prefixed with 'Playwright ')
 * @param {string} type - Actor type (character, npc)
 * @param {Object} actorData - Additional actor data to merge
 */
export async function createActor(page, name = 'Test Character', type = 'character', actorData = {}) {
    return await page.evaluate(async ({ name, type, actorData }) => {
        const baseData = {
            name: `Playwright ${name}`,
            type,
            ...actorData
        };

        const actor = await Actor.create(baseData);
        return actor.id;
    }, { name, type, actorData });
}

/**
 * Create a spell and add it to an actor
 * @param {import('@playwright/test').Page} page
 * @param {string} actorId - ID of the actor to add the spell to
 * @param {string} name - Spell name (will be prefixed with 'Playwright ')
 * @param {Object} spellData - Additional spell data to merge
 * @returns {Promise<string>} The spell's ID
 */
export async function createSpell(page, actorId, name = 'Test Spell', spellData = {}) {
    return await page.evaluate(async ({ actorId, name, spellData }) => {
        const actor = game?.actors.get(actorId);
        const baseSpellData = {
            name: `Playwright ${name}`,
            type: 'spell',
            system: {
                level: 1,
                school: 'div',
                properties: [],
                preparation: { mode: 'prepared', prepared: true },
                activities: {
                    dnd5eactivity000: {
                        type: 'utility',
                        activation: { type: 'action' },
                        consumption: { spellSlot: true },
                        duration: { units: 'minute', value: 10 },
                        range: { units: 'self' },
                        target: { type: 'self' }
                    }
                }
            }
        };
        foundry.utils.mergeObject(baseSpellData, spellData, { recursive: true });

        const [spell] = await actor.createEmbeddedDocuments('Item', [baseSpellData]);
        return spell.id;
    }, { actorId, name, spellData });
}

/**
 * Reduce character's HP for testing purposes
 * @param {import('@playwright/test').Page} page
 * @param {string} actorId
 * @param {number} damage - Amount of damage to deal
 * @returns {Promise<number>} The character's new HP value
 */
export async function damageActor(page, actorId, damage) {
    return await page.evaluate(async ({ id, dmg }) => {
        const actor = game?.actors.get(id);
        const currentHP = actor.system.attributes.hp.value;
        const newHP = Math.max(0, currentHP - dmg);

        await actor.update({ 'system.attributes.hp.value': newHP });
        return newHP;
    }, { id: actorId, dmg: damage });
}

/**
 * Get module setting value
 * @param {import('@playwright/test').Page} page
 * @param {string} settingKey
 */
export async function getModuleSetting(page, settingKey) {
    return await page.evaluate(key => {
        return game?.settings.get('sosly-5e-house-rules', key);
    }, settingKey);
}

/**
 * Import an actor using Foundry's import system
 * @param {import('@playwright/test').Page} page
 * @param {string} jsonData - JSON string of actor data
 * @param {string} testName - Optional name for the test actor (will be prefixed with 'Playwright ')
 */
export async function importActor(page, jsonData, testName = 'Test Actor') {
    return await page.evaluate(async ({ data, name }) => {
        try {
            // Parse the JSON data
            const actorData = JSON.parse(data);

            // Update the name to include Playwright prefix
            actorData.name = `Playwright ${name} ${actorData.name}`;

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

export async function isLoggedInUser(page, username) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => window.game?.ready === true, { timeout: 30000 });

    // Check if the user is logged in
    const currentUser = await page.evaluate(() => game?.user?.name);
    expect(currentUser).toBe(username);
}

/**
 * Login to FoundryVTT as Gamemaster
 * @param {import('@playwright/test').Page} page
 * @param username string - Username of the Gamemaster to log in as
 */
export async function loginUser(page, username) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Attempt to log in as the Gamemaster
    const joinButton = page.locator('button[name="join"]');
    await expect(joinButton).toBeVisible({ timeout: 5000 });

    const userSelect = page.locator('select').first();
    await expect(userSelect).toBeVisible();

    await userSelect.selectOption({ label: username });
    await joinButton.click();

    await page.waitForFunction(() => window.game?.ready === true, { timeout: 30000 });

    // Wait for our module to be active
    await page.waitForFunction(() => {
        return game?.modules.get('sosly-5e-house-rules')?.active;
    }, { timeout: 30000 });

    // Verify that you are logged in as expected user
    const currentUser = await page.evaluate(() => game?.user?.name);
    expect(currentUser).toBe(username);
}

/**
 * Logout the current user to free up the GM slot
 * @param {import('@playwright/test').Page} page
 */
export async function logoutUser(page) {
    // Attempt to log out
    await page.click('#ui-right a.item[data-tab="settings"]');
    await page.waitForSelector('#ui-right button[data-action="logout"]', { timeout: 5000 });
    await page.click('#ui-right button[data-action="logout"]');
    await page.waitForTimeout(1000); // wait for the transition to the login screen

    // Wait for the website to be ready
    await page.waitForLoadState('networkidle');

    // Confirm that you are on the login page
    const joinButton = page.locator('button[name="join"]');
    await expect(joinButton).toBeVisible({ timeout: 5000 });
}

/**
 * Set module setting value
 * @param {import('@playwright/test').Page} page
 * @param {string} settingKey
 * @param {any} value
 */
export async function setModuleSetting(page, settingKey, value) {
    return await page.evaluate(async ({ key, val }) => {
        return await game?.settings.set('sosly-5e-house-rules', key, val);
    }, { key: settingKey, val: value });
}
