import { PlacedObject } from './PlacedObject.js';
import { TileMap } from './TileMap.js';

export const SAVE_FORMAT = 'theme-neutral-isometric-world';
export const SAVE_VERSION = 2;

function error(path, message) {
    return { path, message };
}

function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function plainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateObjectRecord(record, index, world, seenIds) {
    const errors = [];
    const path = `tileMap.objects[${index}]`;
    if (!plainObject(record)) return [error(path, 'must be an object')];

    if (!Number.isInteger(record.id) || record.id < 1) errors.push(error(`${path}.id`, 'must be a positive integer'));
    if (seenIds.has(record.id)) errors.push(error(`${path}.id`, 'must be unique'));
    seenIds.add(record.id);

    const asset = world.assetIndex[record.assetId];
    if (!asset) errors.push(error(`${path}.assetId`, 'is unknown in this world'));
    else if (asset.kind !== 'object') errors.push(error(`${path}.assetId`, 'must refer to an object asset'));

    if (!Number.isInteger(record.gx) || !Number.isInteger(record.gy)) {
        errors.push(error(path, 'gx and gy must be integers'));
    }

    if (!plainObject(record.footprint)
        || !Number.isInteger(record.footprint.w)
        || !Number.isInteger(record.footprint.d)
        || record.footprint.w < 1
        || record.footprint.d < 1) {
        errors.push(error(`${path}.footprint`, 'must contain positive integer w and d'));
    } else if (asset
        && (record.footprint.w !== asset.footprint.w || record.footprint.d !== asset.footprint.d)) {
        errors.push(error(`${path}.footprint`, 'must match the current asset definition'));
    }

    if (![0, 90, 180, 270].includes(record.rotation ?? 0)) {
        errors.push(error(`${path}.rotation`, 'must be 0, 90, 180 or 270'));
    }
    return errors;
}

export function validateSaveV2(payload, world) {
    const errors = [];
    if (!plainObject(payload)) return { ok: false, errors: [error('$', 'save must be an object')] };

    if (payload.format !== SAVE_FORMAT) errors.push(error('format', `must equal ${SAVE_FORMAT}`));
    if (payload.version !== SAVE_VERSION) errors.push(error('version', `must equal ${SAVE_VERSION}`));
    if (payload.worldId !== world.id) errors.push(error('worldId', `must equal ${world.id}`));

    const tileMap = payload.tileMap;
    if (!plainObject(tileMap)) {
        errors.push(error('tileMap', 'must be an object'));
    } else {
        if (tileMap.width !== world.grid.width || tileMap.height !== world.grid.height) {
            errors.push(error('tileMap', 'dimensions must match the selected world definition'));
        }
        const expectedTerrain = world.grid.width * world.grid.height;
        if (!Array.isArray(tileMap.terrain) || tileMap.terrain.length !== expectedTerrain) {
            errors.push(error('tileMap.terrain', `must contain exactly ${expectedTerrain} entries`));
        } else {
            tileMap.terrain.forEach((assetId, index) => {
                if (assetId === null) return;
                const asset = world.assetIndex[assetId];
                if (!asset || asset.kind !== 'terrain') {
                    errors.push(error(`tileMap.terrain[${index}]`, 'must be null or a known terrain asset id'));
                }
            });
        }

        if (!Array.isArray(tileMap.objects)) {
            errors.push(error('tileMap.objects', 'must be an array'));
        } else {
            const seenIds = new Set();
            tileMap.objects.forEach((record, index) => {
                errors.push(...validateObjectRecord(record, index, world, seenIds));
            });
        }
    }

    const view = payload.view;
    if (!plainObject(view)
        || !finiteNumber(view.offsetX)
        || !finiteNumber(view.offsetY)
        || !finiteNumber(view.zoom)) {
        errors.push(error('view', 'must contain finite offsetX, offsetY and zoom values'));
    } else if (view.zoom < world.camera.minZoom || view.zoom > world.camera.maxZoom) {
        errors.push(error('view.zoom', 'is outside the world camera zoom range'));
    }

    if (!plainObject(payload.ui)) errors.push(error('ui', 'must be an object'));
    if (!finiteNumber(Date.parse(payload.createdAt))) errors.push(error('createdAt', 'must be an ISO timestamp'));
    if (!finiteNumber(Date.parse(payload.updatedAt))) errors.push(error('updatedAt', 'must be an ISO timestamp'));

    if (errors.length > 0) return { ok: false, errors };

    try {
        TileMap.fromSnapshot(payload.tileMap, (record) => new PlacedObject(record));
    } catch (caught) {
        return { ok: false, errors: [error('tileMap.objects', caught.message)] };
    }

    return { ok: true, value: payload, errors: [] };
}

export function buildSaveV2({ world, tileMap, view, ui = {}, now = new Date(), createdAt = null }) {
    const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    return {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        worldId: world.id,
        createdAt: createdAt ?? timestamp,
        updatedAt: timestamp,
        tileMap: tileMap.serialize(),
        view: {
            offsetX: Number(view.offsetX),
            offsetY: Number(view.offsetY),
            zoom: Number(view.zoom),
        },
        ui: {
            selectedAssetId: ui.selectedAssetId ?? null,
            category: ui.category ?? null,
            tool: ui.tool ?? 'place',
        },
    };
}

export function migrateLegacyV1(payload, world, now = new Date()) {
    if (!plainObject(payload) || payload.v !== 1 || !plainObject(payload.tileMap)) {
        return { ok: false, errors: [error('$', 'not a recognised v1 save')] };
    }
    const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const migrated = {
        format: SAVE_FORMAT,
        version: SAVE_VERSION,
        worldId: world.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        tileMap: {
            width: payload.tileMap.width,
            height: payload.tileMap.height,
            terrain: [...(payload.tileMap.terrain ?? [])],
            objects: (payload.tileMap.objects ?? []).map((record) => ({
                ...record,
                rotation: record.rotation ?? 0,
                metadata: record.metadata ?? {},
            })),
        },
        view: {
            offsetX: payload.camera?.offsetX ?? 0,
            offsetY: payload.camera?.offsetY ?? 0,
            zoom: payload.camera?.zoom ?? world.camera.defaultZoom,
        },
        ui: { selectedAssetId: null, category: null, tool: 'place' },
    };
    const validated = validateSaveV2(migrated, world);
    return validated.ok
        ? { ok: true, value: migrated, migratedFrom: 1 }
        : { ok: false, errors: validated.errors };
}

export class BrowserSaveStore {
    constructor({ storage, world, key = null, clock = () => new Date() }) {
        this.storage = storage;
        this.world = world;
        this.key = key ?? `isometric-builder.${world.id}.save.v2`;
        this.clock = clock;
    }

    save(tileMap, view, ui = {}, createdAt = null) {
        const payload = buildSaveV2({
            world: this.world,
            tileMap,
            view,
            ui,
            now: this.clock(),
            createdAt,
        });
        const validated = validateSaveV2(payload, this.world);
        if (!validated.ok) return validated;
        try {
            this.storage.setItem(this.key, JSON.stringify(payload));
            return { ok: true, value: payload };
        } catch (caught) {
            return { ok: false, errors: [error('$storage', caught.message)] };
        }
    }

    load() {
        let raw;
        try {
            raw = this.storage.getItem(this.key);
        } catch (caught) {
            return { ok: false, errors: [error('$storage', caught.message)] };
        }
        if (!raw) return { ok: false, empty: true, errors: [] };

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return { ok: false, errors: [error('$', 'save is not valid JSON')] };
        }

        const migrated = parsed?.v === 1 ? migrateLegacyV1(parsed, this.world, this.clock()) : { ok: true, value: parsed };
        if (!migrated.ok) return migrated;

        const validated = validateSaveV2(migrated.value, this.world);
        if (!validated.ok) return validated;

        const tileMap = TileMap.fromSnapshot(validated.value.tileMap, (record) => new PlacedObject(record));
        return {
            ok: true,
            value: validated.value,
            tileMap,
            view: { ...validated.value.view },
            ui: { ...validated.value.ui },
            migratedFrom: migrated.migratedFrom ?? null,
        };
    }

    clear() {
        try {
            this.storage.removeItem(this.key);
            return { ok: true };
        } catch (caught) {
            return { ok: false, errors: [error('$storage', caught.message)] };
        }
    }
}
