import {id as module_id} from '../../../module.json';
import { handleTransformationCleanup, handleTransformationCleanupSocket } from './handler';

export function registerTransformationCleanupTests() {
    quench.registerBatch('sosly-5e-house-rules.transformation-cleanup', context => {
        const { describe, it, assert, before, after, beforeEach, afterEach } = context;

        describe('Transformation Cleanup Feature', function() {
            let testActor;
            let tempActor;
            let originalIsGM;
            let originalActiveGM;
            let originalSocketEmit;
            let emittedMessages;

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

            beforeEach(function() {
                originalIsGM = game.user.isGM;
                originalActiveGM = Object.getOwnPropertyDescriptor(game.users, 'activeGM');
                originalSocketEmit = game.socket.emit;
                emittedMessages = [];

                game.socket.emit = function(channel, data) {
                    emittedMessages.push({ channel, data });
                };
            });

            afterEach(function() {
                Object.defineProperty(game.user, 'isGM', {
                    value: originalIsGM,
                    writable: true,
                    configurable: true
                });
                if (originalActiveGM) {
                    Object.defineProperty(game.users, 'activeGM', originalActiveGM);
                }
                game.socket.emit = originalSocketEmit;
            });

            describe('Player Path (handleTransformationCleanup)', function() {
                beforeEach(function() {
                    Object.defineProperty(game.user, 'isGM', {
                        value: false,
                        writable: true,
                        configurable: true
                    });
                    Object.defineProperty(game.users, 'activeGM', {
                        value: { id: 'gm-user-id' },
                        configurable: true
                    });
                });

                it('should not run if setting is disabled', function() {
                    game.settings.set(module_id, 'transformation-cleanup', false);

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: true,
                        getFlag: () => []
                    };

                    handleTransformationCleanup(mockActor, {});
                    assert.equal(emittedMessages.length, 0);
                });

                it('should not run for non-character actors', function() {
                    game.settings.set(module_id, 'transformation-cleanup', true);

                    const mockActor = {
                        type: 'npc',
                        isPolymorphed: true,
                        getFlag: () => []
                    };

                    handleTransformationCleanup(mockActor, {});
                    assert.equal(emittedMessages.length, 0);
                });

                it('should not run for non-polymorphed actors', function() {
                    game.settings.set(module_id, 'transformation-cleanup', true);

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: false,
                        getFlag: () => []
                    };

                    handleTransformationCleanup(mockActor, {});
                    assert.equal(emittedMessages.length, 0);
                });

                it('should not run if user is GM', function() {
                    game.settings.set(module_id, 'transformation-cleanup', true);
                    Object.defineProperty(game.user, 'isGM', {
                        value: true,
                        writable: true,
                        configurable: true
                    });

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: true,
                        id: tempActor.id,
                        getFlag: (module, key) => {
                            if (key === 'previousActorIds') {return [tempActor.id];}
                            if (key === 'originalActor') {return testActor.id;}
                            return null;
                        }
                    };

                    handleTransformationCleanup(mockActor, {});
                    assert.equal(emittedMessages.length, 0);
                });

                it('should not run if no previous actor IDs exist', function() {
                    game.settings.set(module_id, 'transformation-cleanup', true);

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: true,
                        getFlag: () => []
                    };

                    handleTransformationCleanup(mockActor, {});
                    assert.equal(emittedMessages.length, 0);
                });

                it('should emit socket message when previous IDs exist', function(done) {
                    game.settings.set(module_id, 'transformation-cleanup', true);

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: true,
                        id: tempActor.id,
                        getFlag: (module, key) => {
                            if (key === 'previousActorIds') {return [tempActor.id];}
                            if (key === 'originalActor') {return testActor.id;}
                            return null;
                        }
                    };

                    handleTransformationCleanup(mockActor, {});

                    setTimeout(() => {
                        assert.equal(emittedMessages.length, 1);
                        assert.equal(emittedMessages[0].channel, `module.${module_id}`);
                        assert.equal(emittedMessages[0].data.action, 'deleteTransformationActors');
                        assert.include(emittedMessages[0].data.actorIds, tempActor.id);
                        done();
                    }, 600);
                });

                it('should warn if no GM is online', function(done) {
                    game.settings.set(module_id, 'transformation-cleanup', true);
                    Object.defineProperty(game.users, 'activeGM', {
                        value: null,
                        configurable: true
                    });

                    const mockActor = {
                        type: 'character',
                        isPolymorphed: true,
                        id: tempActor.id,
                        getFlag: (module, key) => {
                            if (key === 'previousActorIds') {return [tempActor.id];}
                            if (key === 'originalActor') {return testActor.id;}
                            return null;
                        }
                    };

                    handleTransformationCleanup(mockActor, {});

                    setTimeout(() => {
                        assert.equal(emittedMessages.length, 0);
                        done();
                    }, 600);
                });
            });

            describe('GM Path (handleTransformationCleanupSocket)', function() {
                beforeEach(function() {
                    Object.defineProperty(game.user, 'isGM', {
                        value: true,
                        writable: true,
                        configurable: true
                    });
                });

                it('should not process if user is not GM', async function() {
                    Object.defineProperty(game.user, 'isGM', {
                        value: false,
                        writable: true,
                        configurable: true
                    });

                    const deleteActor = await Actor.create({
                        name: 'To Delete',
                        type: 'character'
                    });

                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors',
                        actorIds: [deleteActor.id]
                    });

                    assert.ok(game.actors.get(deleteActor.id), 'Actor should still exist');
                    await deleteActor.delete();
                });

                it('should not process wrong action type', async function() {
                    const deleteActor = await Actor.create({
                        name: 'To Delete',
                        type: 'character'
                    });

                    await handleTransformationCleanupSocket({
                        action: 'wrongAction',
                        actorIds: [deleteActor.id]
                    });

                    assert.ok(game.actors.get(deleteActor.id), 'Actor should still exist');
                    await deleteActor.delete();
                });

                it('should not process empty actorIds', async function() {
                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors',
                        actorIds: []
                    });
                });

                it('should not process missing actorIds', async function() {
                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors'
                    });
                });

                it('should delete actors with valid request', async function() {
                    const deleteActor = await Actor.create({
                        name: 'To Delete',
                        type: 'character'
                    });

                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors',
                        actorIds: [deleteActor.id]
                    });

                    assert.notOk(game.actors.get(deleteActor.id), 'Actor should be deleted');
                });

                it('should filter out non-existent actor IDs', async function() {
                    const deleteActor = await Actor.create({
                        name: 'To Delete',
                        type: 'character'
                    });

                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors',
                        actorIds: [deleteActor.id, 'nonexistent-id']
                    });

                    assert.notOk(game.actors.get(deleteActor.id), 'Actor should be deleted');
                });

                it('should handle all non-existent IDs gracefully', async function() {
                    await handleTransformationCleanupSocket({
                        action: 'deleteTransformationActors',
                        actorIds: ['nonexistent-id-1', 'nonexistent-id-2']
                    });
                });
            });
        });
    }, { displayName: 'SoSly 5e House Rules: Transformation Cleanup' });
}
