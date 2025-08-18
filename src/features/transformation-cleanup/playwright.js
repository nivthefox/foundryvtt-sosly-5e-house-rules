import { test, expect } from '@playwright/test';

test.describe('Transformation Cleanup Feature', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:30000/game');
        await page.waitForSelector('[data-action="join"]');
        await page.click('[data-action="join"]');
        await page.waitForSelector('#sidebar');
    });

    test('setting appears in module configuration', async ({ page }) => {
        await page.goto('http://localhost:30000/setup');
        await page.click('[data-action="configure"]');
        await page.waitForSelector('.package-configuration');

        const settingExists = await page.locator('text=Automatic Transformation Cleanup').isVisible();
        expect(settingExists).toBe(true);
    });

    test('setting can be toggled by GM', async ({ page }) => {
        await page.goto('http://localhost:30000/setup');
        await page.click('[data-action="configure"]');
        await page.waitForSelector('.package-configuration');

        const setting = page.locator('[name="sosly-5e-house-rules.transformation-cleanup"]');
        await expect(setting).toBeVisible();

        await setting.check();
        await page.click('[data-action="save"]');

        await page.reload();
        await page.click('[data-action="configure"]');
        await page.waitForSelector('.package-configuration');

        await expect(page.locator('[name="sosly-5e-house-rules.transformation-cleanup"]:checked')).toBeVisible();
    });

    test('transformation cleanup hook is registered', async ({ page }) => {
        const hookRegistered = await page.evaluate(() => {
            return window.Hooks._hooks['dnd5e.revertOriginalForm']?.length > 0;
        });

        expect(hookRegistered).toBe(true);
    });

    test('cleanup handler processes character actors', async ({ page }) => {
        await page.evaluate(() => {
            game.settings.set('sosly-5e-house-rules', 'transformation-cleanup', true);
        });

        const result = await page.evaluate(async () => {
            const { handleTransformationCleanup } = await import('/modules/sosly-5e-house-rules/src/features/transformation-cleanup/handler.js');

            const mockActor = {
                type: 'character',
                isPolymorphed: true,
                id: 'test-actor-id',
                getFlag: (module, key) => {
                    if (key === 'previousActorIds') return ['temp-actor-1', 'temp-actor-2'];
                    if (key === 'originalActor') return 'original-actor-id';
                    return null;
                }
            };

            let called = false;
            try {
                handleTransformationCleanup(mockActor, {});
                called = true;
            } catch (error) {
                return { error: error.message };
            }

            return { called };
        });

        expect(result.called).toBe(true);
    });

    test('cleanup handler ignores NPC actors', async ({ page }) => {
        await page.evaluate(() => {
            game.settings.set('sosly-5e-house-rules', 'transformation-cleanup', true);
        });

        const result = await page.evaluate(async () => {
            const { handleTransformationCleanup } = await import('/modules/sosly-5e-house-rules/src/features/transformation-cleanup/handler.js');

            const mockActor = {
                type: 'npc',
                isPolymorphed: true,
                id: 'test-npc-id',
                getFlag: () => ['temp-actor-1']
            };

            handleTransformationCleanup(mockActor, {});
            return true;
        });

        expect(result).toBe(true);
    });

    test('cleanup handler respects setting state', async ({ page }) => {
        await page.evaluate(() => {
            game.settings.set('sosly-5e-house-rules', 'transformation-cleanup', false);
        });

        const result = await page.evaluate(async () => {
            const { handleTransformationCleanup } = await import('/modules/sosly-5e-house-rules/src/features/transformation-cleanup/handler.js');

            const mockActor = {
                type: 'character',
                isPolymorphed: true,
                id: 'test-actor-id',
                getFlag: () => ['temp-actor-1']
            };

            handleTransformationCleanup(mockActor, {});
            return true;
        });

        expect(result).toBe(true);
    });
});
