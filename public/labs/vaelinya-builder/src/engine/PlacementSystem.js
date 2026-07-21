import { PlacedObject } from './PlacedObject.js';
import { PlacementRuleEvaluator } from './PlacementRules.js';

export class PlacementSystem {
    constructor(tileMap, world) {
        this.tileMap = tileMap;
        this.world = world;
        this.rules = new PlacementRuleEvaluator(tileMap, world);
    }

    canPlace(assetId, gx, gy) {
        return this.rules.evaluate(assetId, gx, gy);
    }

    place(assetId, gx, gy, options = {}) {
        const verdict = this.canPlace(assetId, gx, gy);
        if (!verdict.ok) return { ...verdict, placed: null };

        const asset = this.world.assetIndex[assetId];
        if (asset.kind === 'terrain') {
            this.tileMap.setTerrain(gx, gy, assetId);
            return { ok: true, code: 'placed_terrain', placed: { kind: 'terrain', assetId, gx, gy } };
        }

        const object = new PlacedObject({
            id: this.tileMap.nextId(),
            assetId,
            gx,
            gy,
            footprint: asset.footprint,
            rotation: options.rotation ?? 0,
            flipH: options.flipH ?? false,
            flipV: options.flipV ?? false,
            metadata: options.metadata ?? {},
        });
        this.tileMap.addObject(object);
        return { ok: true, code: 'placed_object', placed: { kind: 'object', object } };
    }

    erase(gx, gy) {
        const order = this.world.behaviour?.eraseOrder ?? ['object', 'terrain'];
        for (const layer of order) {
            if (layer === 'object') {
                const object = this.tileMap.removeObjectAt(gx, gy);
                if (object) return { ok: true, kind: 'object', removed: object };
            }
            if (layer === 'terrain' && this.tileMap.getTerrain(gx, gy)) {
                const assetId = this.tileMap.getTerrain(gx, gy);
                this.tileMap.clearTerrain(gx, gy);
                return { ok: true, kind: 'terrain', removed: { assetId, gx, gy } };
            }
        }
        return { ok: false, code: 'nothing_to_erase' };
    }
}
