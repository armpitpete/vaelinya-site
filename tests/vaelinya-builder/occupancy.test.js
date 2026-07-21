import test from 'node:test';
import assert from 'node:assert/strict';
import { PlacedObject } from '../../public/labs/vaelinya-builder/src/engine/PlacedObject.js';
import { TileMap } from '../../public/labs/vaelinya-builder/src/engine/TileMap.js';

test('multi-cell objects stamp and clear the occupancy index', () => {
    const map = new TileMap(8, 8);
    const home = new PlacedObject({ id: 7, assetId: 'home', gx: 2, gy: 3, footprint: { w: 2, d: 2 } });
    assert.equal(map.addObject(home), true);
    assert.equal(map.objectAt(2, 3), home);
    assert.equal(map.objectAt(3, 4), home);
    assert.equal(map.isFreeFor(3, 4, 1, 1), false);
    assert.equal(map.removeObjectAt(3, 3), home);
    assert.equal(map.objectAt(2, 3), null);
    assert.equal(map.isFreeFor(2, 3, 2, 2), true);
});

test('deserialisation chooses max loaded object id plus one', () => {
    const map = TileMap.fromSnapshot({
        width: 6,
        height: 6,
        terrain: new Array(36).fill(null),
        objects: [
            { id: 1, assetId: 'plant', gx: 0, gy: 0, footprint: { w: 1, d: 1 } },
            { id: 4, assetId: 'plant', gx: 2, gy: 2, footprint: { w: 1, d: 1 } },
        ],
    });
    assert.equal(map.nextId(), 5);
});

test('deserialisation rejects overlapping object snapshots', () => {
    assert.throws(() => TileMap.fromSnapshot({
        width: 4,
        height: 4,
        terrain: new Array(16).fill(null),
        objects: [
            { id: 2, assetId: 'a', gx: 1, gy: 1, footprint: { w: 2, d: 2 } },
            { id: 3, assetId: 'b', gx: 2, gy: 2, footprint: { w: 1, d: 1 } },
        ],
    }), /overlaps or is out of bounds/);
});
