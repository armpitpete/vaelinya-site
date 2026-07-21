const REQUIRED_WORLD_FIELDS = ['id', 'title', 'grid', 'tile', 'camera', 'assets', 'categories', 'theme'];

function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}

export function createAssetIndex(world) {
    return Object.freeze(Object.fromEntries(world.assets.map((asset) => [asset.id, asset])));
}

export function validateWorldDefinition(world) {
    const errors = [];
    if (!world || typeof world !== 'object') return { ok: false, errors: ['world must be an object'] };

    for (const field of REQUIRED_WORLD_FIELDS) {
        if (world[field] == null) errors.push(`missing world field: ${field}`);
    }

    if (!isPositiveInteger(world.grid?.width) || !isPositiveInteger(world.grid?.height)) {
        errors.push('grid width and height must be positive integers');
    }
    if (!Number.isFinite(world.tile?.w) || !Number.isFinite(world.tile?.h) || world.tile.w <= 0 || world.tile.h <= 0) {
        errors.push('tile w and h must be positive numbers');
    }
    if (!Array.isArray(world.categories) || world.categories.length === 0) errors.push('categories must be non-empty');
    if (!Array.isArray(world.assets) || world.assets.length === 0) errors.push('assets must be non-empty');

    const ids = new Set();
    for (const asset of world.assets ?? []) {
        if (!asset?.id || typeof asset.id !== 'string') errors.push('every asset requires a string id');
        if (ids.has(asset?.id)) errors.push(`duplicate asset id: ${asset.id}`);
        ids.add(asset?.id);
        if (!['terrain', 'object'].includes(asset?.kind)) errors.push(`invalid kind for ${asset?.id}`);
        if (!isPositiveInteger(asset?.footprint?.w) || !isPositiveInteger(asset?.footprint?.d)) {
            errors.push(`invalid footprint for ${asset?.id}`);
        }
        if (!world.categories.includes(asset?.category)) errors.push(`unknown category for ${asset?.id}`);
    }

    if (!Number.isFinite(world.camera?.minZoom)
        || !Number.isFinite(world.camera?.maxZoom)
        || world.camera.minZoom <= 0
        || world.camera.maxZoom < world.camera.minZoom) {
        errors.push('camera zoom range is invalid');
    }

    return errors.length === 0 ? { ok: true, value: world } : { ok: false, errors };
}

export function defineWorld(world) {
    const result = validateWorldDefinition(world);
    if (!result.ok) throw new Error(`Invalid world definition:\n- ${result.errors.join('\n- ')}`);
    return Object.freeze({ ...world, assetIndex: createAssetIndex(world) });
}
