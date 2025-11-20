import {id as module_id} from '../../../module.json';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

const OLD_MODULE_ID = 'items-with-spells-5e';
const ITEM_SPELLS_FLAG = 'item-spells';
const PARENT_ITEM_FLAG = 'parent-item';

export function registerMigration() {
    game.settings.register(module_id, 'items-with-spells-migrated', {
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    });

    game.settings.registerMenu(module_id, 'items-with-spells-migration', {
        name: game.i18n.localize('sosly.items-with-spells.migration.label'),
        hint: getMigrationHint(),
        label: game.i18n.localize('sosly.items-with-spells.migration.label'),
        icon: 'fas fa-file-import',
        type: MigrationDialog,
        restricted: true
    });
}

function getMigrationHint() {
    const migrated = game.settings.get(module_id, 'items-with-spells-migrated');
    if (migrated) {
        return game.i18n.localize('sosly.items-with-spells.migration.completed-hint');
    }
    return game.i18n.localize('sosly.items-with-spells.migration.hint');
}

class MigrationDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'sosly-items-with-spells-migration',
        tag: 'div',
        position: {
            width: 480,
            height: 'auto'
        },
        window: {
            icon: 'fas fa-file-import',
            title: 'sosly.items-with-spells.migration.confirm-title'
        }
    };

    static PARTS = {
        content: {
            template: 'modules/sosly-5e-house-rules/templates/features/items-with-spells/migration-dialog.hbs'
        }
    };

    async _prepareContext() {
        const migrated = game.settings.get(module_id, 'items-with-spells-migrated');

        if (migrated) {
            return {
                migrated: true,
                message: game.i18n.localize('sosly.items-with-spells.migration.completed-hint')
            };
        }

        const {itemCount, spellCount} = await scanForMigratableData();

        return {
            migrated: false,
            itemCount,
            spellCount,
            hasData: itemCount > 0 || spellCount > 0,
            message: game.i18n.format('sosly.items-with-spells.migration.confirm-message', {
                itemCount,
                spellCount
            })
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        this.element.querySelector('[data-action="migrate"]')?.addEventListener('click', async () => {
            await this.performMigration();
        });

        this.element.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
            this.close();
        });
    }

    async performMigration() {
        const button = this.element.querySelector('[data-action="migrate"]');
        if (button) {
            button.disabled = true;
            button.textContent = `${game.i18n.localize('Working')}...`;
        }

        try {
            const result = await migrateItemsWithSpells();
            await game.settings.set(module_id, 'items-with-spells-migrated', true);

            if (result.failureCount > 0) {
                ui.notifications.warn(game.i18n.format('sosly.items-with-spells.migration.partial-failure', {
                    successCount: result.successCount,
                    failureCount: result.failureCount
                }));
            } else {
                ui.notifications.info(game.i18n.format('sosly.items-with-spells.migration.complete', {
                    itemCount: result.itemCount,
                    spellCount: result.spellCount
                }));
            }

            this.close();
        } catch (error) {
            console.error('Migration failed:', error);
            ui.notifications.error('Migration failed. Check console for details.');
            if (button) {
                button.disabled = false;
                button.textContent = game.i18n.localize('Migrate');
            }
        }
    }
}

async function scanForMigratableData() {
    let itemCount = 0;
    let spellCount = 0;

    for (const item of game.items) {
        if (item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG]) {
            itemCount++;
        }
        if (item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG]) {
            spellCount++;
        }
    }

    for (const actor of game.actors) {
        for (const item of actor.items) {
            if (item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG]) {
                itemCount++;
            }
            if (item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG]) {
                spellCount++;
            }
        }
    }

    return {itemCount, spellCount};
}

async function migrateItemsWithSpells() {
    console.log('Starting items-with-spells migration from', OLD_MODULE_ID, 'to', module_id);

    let itemCount = 0;
    let spellCount = 0;
    let successCount = 0;
    let failureCount = 0;

    const worldItems = [];
    for (const item of game.items) {
        if (item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG] || item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG]) {
            worldItems.push(item);
        }
    }

    for (const item of worldItems) {
        try {
            const updates = {};
            const hadItemSpells = !!item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG];
            const hadParentItem = !!item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG];

            if (hadItemSpells) {
                const itemSpells = item.flags[OLD_MODULE_ID][ITEM_SPELLS_FLAG];
                updates[`flags.${module_id}.${ITEM_SPELLS_FLAG}`] = itemSpells;
                itemCount++;
            }

            if (hadParentItem) {
                const parentItem = item.flags[OLD_MODULE_ID][PARENT_ITEM_FLAG];
                updates[`flags.${module_id}.${PARENT_ITEM_FLAG}`] = parentItem;
                spellCount++;
            }

            await item.update(updates);
            successCount++;
            console.log('Migrated world item:', item.name, item.id);
        } catch (error) {
            console.error('Failed to migrate world item:', item.name, item.id, error);
            failureCount++;
        }
    }

    for (const actor of game.actors) {
        const actorItems = [];
        for (const item of actor.items) {
            if (item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG] || item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG]) {
                actorItems.push(item);
            }
        }

        for (const item of actorItems) {
            try {
                const updates = {_id: item.id};
                const hadItemSpells = !!item.flags[OLD_MODULE_ID]?.[ITEM_SPELLS_FLAG];
                const hadParentItem = !!item.flags[OLD_MODULE_ID]?.[PARENT_ITEM_FLAG];

                if (hadItemSpells) {
                    const itemSpells = item.flags[OLD_MODULE_ID][ITEM_SPELLS_FLAG];
                    updates[`flags.${module_id}.${ITEM_SPELLS_FLAG}`] = itemSpells;
                    itemCount++;
                }

                if (hadParentItem) {
                    const parentItem = item.flags[OLD_MODULE_ID][PARENT_ITEM_FLAG];
                    updates[`flags.${module_id}.${PARENT_ITEM_FLAG}`] = parentItem;
                    spellCount++;
                }

                await item.update(updates);
                successCount++;
                console.log('Migrated actor item:', actor.name, '-', item.name, item.id);
            } catch (error) {
                console.error('Failed to migrate actor item:', actor.name, '-', item.name, item.id, error);
                failureCount++;
            }
        }
    }

    console.log('Migration complete:', {itemCount, spellCount, successCount, failureCount});

    return {itemCount, spellCount, successCount, failureCount};
}
