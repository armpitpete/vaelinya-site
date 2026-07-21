import test from 'node:test';
import assert from 'node:assert/strict';
import { PlacementSystem } from '../../public/labs/vaelinya-builder/src/engine/PlacementSystem.js';
import { TileMap } from '../../public/labs/vaelinya-builder/src/engine/TileMap.js';
import { vaelinyaWorld } from '../../public/labs/vaelinya-builder/src/worlds/vaelinya.js';

function meadowMap() {
    const map = new TileMap(vaelinyaWorld.grid.width, vaelinyaWorld.grid.height);
    for (let gy = 0; gy < map.height; gy += 1) {
        for (let gx = 0; gx < map.width; gx += 1) map.setTerrain(gx, gy, 'vaelinya-meadow');
    }
    return map;
}

test('boat placement is declaratively restricted to river terrain', () => {
    const map = meadowMap();
    const placement = new PlacementSystem(map, vaelinyaWorld);
    assert.equal(placement.canPlace('rimaeri-boat', 2, 2).code, 'terrain_not_allowed');
    placement.place('vaelinya-river', 2, 2);
    assert.equal(placement.place('rimaeri-boat', 2, 2).ok, true);
});

test('riverbank requires land beneath it and adjacent river terrain', () => {
    const map = meadowMap();
    const placement = new PlacementSystem(map, vaelinyaWorld);
    assert.equal(placement.canPlace('riverbank-step', 3, 3).code, 'adjacency_required');
    placement.place('vaelinya-river', 3, 4);
    assert.equal(placement.place('riverbank-step', 3, 3).ok, true);
});

test('unique shared and landmark assets cannot be duplicated', () => {
    const map = meadowMap();
    const placement = new PlacementSystem(map, vaelinyaWorld);
    assert.equal(placement.place('listening-circle', 1, 1).ok, true);
    assert.equal(placement.canPlace('listening-circle', 6, 6).code, 'world_limit_reached');
    assert.equal(placement.place('navan-marker', 8, 1).ok, true);
    assert.equal(placement.canPlace('navan-marker', 8, 5).code, 'world_limit_reached');
});

test('terrain replacement keeps objects above it', () => {
    const map = meadowMap();
    const placement = new PlacementSystem(map, vaelinyaWorld);
    assert.equal(placement.place('silver-grass', 4, 4).ok, true);
    assert.equal(placement.place('vaelinya-soft-earth', 4, 4).ok, true);
    assert.equal(map.objectAt(4, 4)?.assetId, 'silver-grass');
    assert.equal(map.getTerrain(4, 4), 'vaelinya-soft-earth');
});
