import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserSaveStore, SAVE_FORMAT, SAVE_VERSION, buildSaveV2, migrateLegacyV1, validateSaveV2 } from '../../public/labs/vaelinya-builder/src/engine/SaveSystem.js';
import { PlacementSystem } from '../../public/labs/vaelinya-builder/src/engine/PlacementSystem.js';
import { TileMap } from '../../public/labs/vaelinya-builder/src/engine/TileMap.js';
import { vaelinyaWorld } from '../../public/labs/vaelinya-builder/src/worlds/vaelinya.js';

class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.get(key) ?? null; }
    setItem(key, value) { this.values.set(key, value); }
    removeItem(key) { this.values.delete(key); }
}

function populatedMap() {
    const map = new TileMap(12, 12);
    const placement = new PlacementSystem(map, vaelinyaWorld);
    for (let gy = 0; gy < map.height; gy += 1) {
        for (let gx = 0; gx < map.width; gx += 1) placement.place('vaelinya-meadow', gx, gy);
    }
    placement.place('silver-grass', 2, 2);
    placement.place('woven-home', 4, 4);
    return map;
}

const fixedDate = new Date('2026-07-21T15:30:00.000Z');

test('Save Format v2 validates and round-trips canonical world state', () => {
    const storage = new MemoryStorage();
    const store = new BrowserSaveStore({ storage, world: vaelinyaWorld, clock: () => fixedDate });
    const map = populatedMap();
    const saved = store.save(map, { offsetX: 12, offsetY: -4, zoom: 1.2 }, { selectedAssetId: 'woven-home', category: 'homes', tool: 'place' });
    assert.equal(saved.ok, true);
    assert.equal(saved.value.format, SAVE_FORMAT);
    assert.equal(saved.value.version, SAVE_VERSION);

    const loaded = store.load();
    assert.equal(loaded.ok, true);
    assert.deepEqual(loaded.tileMap.serialize(), map.serialize());
    assert.deepEqual(loaded.view, { offsetX: 12, offsetY: -4, zoom: 1.2 });
    assert.equal(loaded.tileMap.nextId(), 3);
});

test('Save Format v2 rejects unknown assets and overlapping objects', () => {
    const payload = buildSaveV2({
        world: vaelinyaWorld,
        tileMap: populatedMap(),
        view: { offsetX: 0, offsetY: 0, zoom: 1 },
        now: fixedDate,
    });
    payload.tileMap.objects[0].assetId = 'unknown-plant';
    const unknown = validateSaveV2(payload, vaelinyaWorld);
    assert.equal(unknown.ok, false);
    assert.match(unknown.errors.map((entry) => entry.message).join(' '), /unknown/);

    const overlapPayload = buildSaveV2({
        world: vaelinyaWorld,
        tileMap: populatedMap(),
        view: { offsetX: 0, offsetY: 0, zoom: 1 },
        now: fixedDate,
    });
    overlapPayload.tileMap.objects.push({
        ...overlapPayload.tileMap.objects[0],
        id: 99,
    });
    const overlap = validateSaveV2(overlapPayload, vaelinyaWorld);
    assert.equal(overlap.ok, false);
    assert.match(overlap.errors.map((entry) => entry.message).join(' '), /overlaps/);
});

test('legacy v1 saves migrate into validated v2 data', () => {
    const map = populatedMap();
    const legacy = {
        v: 1,
        tileMap: map.serialize(),
        camera: { offsetX: 5, offsetY: 7, zoom: 1.1 },
    };
    const migrated = migrateLegacyV1(legacy, vaelinyaWorld, fixedDate);
    assert.equal(migrated.ok, true);
    assert.equal(migrated.value.version, 2);
    assert.equal(migrated.value.worldId, vaelinyaWorld.id);
    assert.deepEqual(migrated.value.view, { offsetX: 5, offsetY: 7, zoom: 1.1 });
});
