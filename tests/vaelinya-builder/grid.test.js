import test from 'node:test';
import assert from 'node:assert/strict';
import { cellInBounds, cellToScreen, screenToCell, screenToCellFloor } from '../../public/labs/vaelinya-builder/src/engine/IsoGrid.js';
import { vaelinyaWorld } from '../../public/labs/vaelinya-builder/src/worlds/vaelinya.js';

test('isometric grid conversion round-trips exact cell anchors', () => {
    for (let gx = 0; gx < vaelinyaWorld.grid.width; gx += 1) {
        for (let gy = 0; gy < vaelinyaWorld.grid.height; gy += 1) {
            const screen = cellToScreen(gx, gy, vaelinyaWorld.tile);
            const cell = screenToCell(screen.x, screen.y, vaelinyaWorld.tile);
            assert.equal(cell.gx, gx);
            assert.equal(cell.gy, gy);
            assert.deepEqual(screenToCellFloor(screen.x + 1, screen.y + 1, vaelinyaWorld.tile), { gx, gy });
        }
    }
});

test('grid bounds reject negative, fractional and edge-overflow coordinates', () => {
    assert.equal(cellInBounds(0, 0, 12, 12), true);
    assert.equal(cellInBounds(11, 11, 12, 12), true);
    assert.equal(cellInBounds(12, 11, 12, 12), false);
    assert.equal(cellInBounds(-1, 0, 12, 12), false);
    assert.equal(cellInBounds(1.5, 2, 12, 12), false);
});
