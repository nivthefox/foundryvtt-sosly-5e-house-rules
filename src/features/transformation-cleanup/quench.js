import {id as module_id} from '../../../module.json';
import { handleTransformationCleanup } from './handler';

export function registerTransformationCleanupTests() {
    quench.registerBatch('sosly-5e-house-rules.transformation-cleanup', context => {
        const { describe, it, before, after } = context;

        describe('Transformation Cleanup Feature', function() {
            let testActor;
            let tempActor;

            before(async function() {
                testActor = await Actor.create({
                    name: 'Test Character',
                    type: 'character'
                });

                tempActor = await Actor.create({
                    name: 'Test Polymorph',
                    type: 'character'
                });
            });

            after(async function() {
                if (game.actors.get(testActor?.id)) {
                    await testActor.delete();
                }
                if (game.actors.get(tempActor?.id)) {
                    await tempActor.delete();
                }
            });

            it('should not run if setting is disabled', function() {
                game.settings.set(module_id, 'transformation-cleanup', false);

                const mockActor = {
                    type: 'character',
                    isPolymorphed: true,
                    getFlag: () => []
                };

                handleTransformationCleanup(mockActor, {});
            });

            it('should not run for non-character actors', function() {
                game.settings.set(module_id, 'transformation-cleanup', true);

                const mockActor = {
                    type: 'npc',
                    isPolymorphed: true,
                    getFlag: () => []
                };

                handleTransformationCleanup(mockActor, {});
            });

            it('should not run for non-polymorphed actors', function() {
                game.settings.set(module_id, 'transformation-cleanup', true);

                const mockActor = {
                    type: 'character',
                    isPolymorphed: false,
                    getFlag: () => []
                };

                handleTransformationCleanup(mockActor, {});
            });

            it('should not run if no previous actor IDs exist', function() {
                game.settings.set(module_id, 'transformation-cleanup', true);

                const mockActor = {
                    type: 'character',
                    isPolymorphed: true,
                    getFlag: () => []
                };

                handleTransformationCleanup(mockActor, {});
            });

            it('should identify actors to delete when previous IDs exist', function() {
                game.settings.set(module_id, 'transformation-cleanup', true);

                const mockActor = {
                    type: 'character',
                    isPolymorphed: true,
                    id: tempActor.id,
                    getFlag: (module, key) => {
                        if (key === 'previousActorIds') return [tempActor.id];
                        if (key === 'originalActor') return testActor.id;
                        return null;
                    }
                };

                handleTransformationCleanup(mockActor, {});
            });
        });
    }, { displayName: 'SoSly 5e House Rules: Transformation Cleanup' });
}
