import { footprintCells, orthogonalNeighbours } from './IsoGrid.js';

function fail(code, message) {
    return { ok: false, code, message };
}

function success() {
    return { ok: true, code: 'ok', message: 'Placement allowed' };
}

function footprintTerrain(tileMap, gx, gy, footprint) {
    return footprintCells(gx, gy, footprint).map((cell) => tileMap.getTerrain(cell.gx, cell.gy));
}

function adjacentTerrain(tileMap, gx, gy, footprint) {
    const seen = new Set();
    const values = [];
    for (const cell of footprintCells(gx, gy, footprint)) {
        for (const neighbour of orthogonalNeighbours(cell.gx, cell.gy)) {
            const key = `${neighbour.gx},${neighbour.gy}`;
            if (seen.has(key) || !tileMap.inBounds(neighbour.gx, neighbour.gy)) continue;
            seen.add(key);
            values.push(tileMap.getTerrain(neighbour.gx, neighbour.gy));
        }
    }
    return values;
}

export class PlacementRuleEvaluator {
    constructor(tileMap, world) {
        this.tileMap = tileMap;
        this.world = world;
    }

    evaluate(assetId, gx, gy) {
        const asset = this.world.assetIndex[assetId];
        if (!asset) return fail('unknown_asset', `Unknown asset: ${assetId}`);
        if (!this.tileMap.inBounds(gx, gy)) return fail('out_of_bounds', 'The selected cell is outside the world');

        if (asset.kind === 'terrain') return success();

        if (!this.tileMap.isFreeFor(gx, gy, asset.footprint.w, asset.footprint.d)) {
            return fail('occupied', 'The object footprint is occupied or outside the world');
        }

        const rules = asset.rules ?? {};
        const terrain = footprintTerrain(this.tileMap, gx, gy, asset.footprint);

        if (rules.requiresTerrain && terrain.some((value) => value == null)) {
            return fail('terrain_required', 'This object requires terrain beneath every occupied cell');
        }
        if (Array.isArray(rules.allowedTerrain)
            && terrain.some((value) => !rules.allowedTerrain.includes(value))) {
            return fail('terrain_not_allowed', 'The terrain beneath this object is not allowed');
        }
        if (Array.isArray(rules.forbiddenTerrain)
            && terrain.some((value) => rules.forbiddenTerrain.includes(value))) {
            return fail('terrain_forbidden', 'This object cannot be placed on the selected terrain');
        }
        if (Array.isArray(rules.requiresAdjacentTerrain)) {
            const adjacent = adjacentTerrain(this.tileMap, gx, gy, asset.footprint);
            if (!adjacent.some((value) => rules.requiresAdjacentTerrain.includes(value))) {
                return fail('adjacency_required', 'This object requires a matching adjacent terrain cell');
            }
        }

        const maximum = rules.uniquePerWorld ? 1 : rules.maxPerWorld;
        if (Number.isInteger(maximum) && this.tileMap.countAsset(assetId) >= maximum) {
            return fail('world_limit_reached', 'The world limit for this asset has been reached');
        }

        return success();
    }
}
