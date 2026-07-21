import test from 'node:test';
import assert from 'node:assert/strict';
import { mykonosRegressionWorld, MYKONOS_UPSTREAM_COMMIT } from '../../public/labs/vaelinya-builder/src/worlds/mykonos.fixture.js';

test('Mykonos regression fixture remains pinned to the authorised upstream commit', () => {
    assert.equal(MYKONOS_UPSTREAM_COMMIT, 'ca5faeea84fc7dc8e18a6b8e899f432884dfe831');
    assert.equal(mykonosRegressionWorld.source.commit, MYKONOS_UPSTREAM_COMMIT);
    assert.deepEqual(mykonosRegressionWorld.grid, { width: 14, height: 14 });
    assert.deepEqual(mykonosRegressionWorld.tile, { w: 64, h: 32 });
    assert.deepEqual(mykonosRegressionWorld.categories, ['terrain', 'nature', 'props', 'water', 'buildings']);
    assert.equal(mykonosRegressionWorld.camera.minZoom, 0.5);
    assert.equal(mykonosRegressionWorld.camera.maxZoom, 3);
    assert.equal(mykonosRegressionWorld.camera.defaultZoom, 1.4);
    assert.equal(mykonosRegressionWorld.storageKey, 'mykonos-island-voxels.save.v1');
});

test('Mykonos fixture preserves placement and starter-scene behaviour contract', () => {
    assert.equal(mykonosRegressionWorld.assets.length, 54);
    assert.equal(mykonosRegressionWorld.behaviour.fillTerrainId, 'grass');
    assert.deepEqual(mykonosRegressionWorld.behaviour.eraseOrder, ['object', 'terrain']);
    assert.equal(mykonosRegressionWorld.behaviour.terrainReplacementKeepsObjects, true);
    assert.equal(mykonosRegressionWorld.starterScene.filter((entry) => entry.assetId === 'grass').length, 196);
    assert.ok(mykonosRegressionWorld.starterScene.some((entry) => entry.assetId === 'villa' && entry.gx === 7 && entry.gy === 7));
    assert.ok(mykonosRegressionWorld.starterScene.some((entry) => entry.assetId === 'small_bridge' && entry.gx === 5 && entry.gy === 12));
});
