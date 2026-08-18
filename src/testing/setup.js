import {chromium} from '@playwright/test';

import {loginUser} from './foundry-helpers.js';
import {assertRuntime} from './runtime.js';

export default async function globalSetup(cfg) {
    const browser = await chromium.launch(cfg.projects[0].use.launchOptions);
    const context = await browser.newContext({
        baseURL: cfg.projects[0].use.baseURL
    });
    const page = await context.newPage();

    try {
        await loginUser(page, 'Gamemaster');
        const runtime = await page.evaluate(moduleId => ({
            coreVersion: game.version,
            systemId: game.system.id,
            systemVersion: game.system.version,
            moduleId: game.modules.get(moduleId)?.id,
            moduleActive: game.modules.get(moduleId)?.active
        }), 'sosly-5e-house-rules');
        assertRuntime(runtime);
    } finally {
        await browser.close();
    }
}
