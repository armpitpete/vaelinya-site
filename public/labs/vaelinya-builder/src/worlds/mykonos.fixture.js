import { defineWorld } from '../engine/WorldDefinition.js';

const terrain = [
    ['grass', 'Grass'], ['path', 'Path'], ['sand', 'Sand'], ['stone', 'Stone'],
    ['water', 'Water'], ['stairs', 'Stairs'], ['sea_wall', 'Sea Wall'],
];
const nature = [
    ['cypress', 'Cypress'], ['bougainvillea', 'Bougainvillea'], ['olive', 'Olive Tree'],
    ['agave', 'Agave'], ['dry_grass', 'Dry Grass'], ['flower_pot', 'Flower Pot'],
];
const props = [
    ['low_wall', 'Low Wall'], ['blue_railing', 'Blue Railing'], ['corner_wall', 'Corner Wall'],
    ['gate_fence', 'Gate Fence'], ['archway', 'Archway'], ['lantern_post', 'Lantern Post'],
    ['stone_lantern', 'Stone Lantern'], ['hanging_lantern', 'Hanging Lantern'], ['bench', 'Bench'],
    ['signpost', 'Signpost'], ['banner', 'Banner'], ['crate', 'Crate'], ['hay_bale', 'Hay Bale'],
    ['storage_box', 'Storage Box'], ['wood_pile', 'Wood Pile'], ['water_bucket', 'Water Bucket'],
    ['pottery_jar', 'Pottery Jar'], ['terracotta_pot', 'Plant Pot'], ['stone_basin', 'Stone Basin'],
    ['rocks', 'Rocks'], ['large_rock', 'Large Rock'], ['mossy_stone', 'Mossy Stone'],
    ['flat_stone', 'Flat Stone'], ['pebbles', 'Pebbles'], ['stone_pile', 'Stone Pile'],
    ['boulder', 'Boulder'],
];
const waterFeatures = [
    ['small_bridge', 'Bridge', { w: 2, d: 1 }], ['well', 'Well'], ['garden_bed', 'Garden Bed'],
    ['crop_patch', 'Crop Patch'], ['veg_garden', 'Veg Garden'],
];
const buildings = [
    ['house', 'House', { w: 2, d: 2 }], ['two_story', 'Two-Story', { w: 3, d: 3 }],
    ['cube_house', 'Cube House', { w: 2, d: 2 }], ['terrace_house', 'Terrace House', { w: 3, d: 2 }],
    ['pergola_house', 'Pergola House', { w: 3, d: 3 }], ['villa', 'Main Villa', { w: 4, d: 4 }],
    ['altar', 'Altar', { w: 2, d: 2 }], ['tower_chapel', 'Tower Chapel', { w: 2, d: 2 }],
    ['main_chapel', 'Main Chapel', { w: 3, d: 3 }], ['windmill', 'Windmill', { w: 2, d: 2 }],
];

const T = ([id, name]) => ({
    id, name, category: 'terrain', kind: 'terrain', footprint: { w: 1, d: 1 },
    visual: { type: 'terrain', top: id === 'water' ? '#6ec8e0' : id === 'grass' ? '#7eaa5f' : '#d6c8b0' },
});
const O = (category, colour, [id, name, footprint = { w: 1, d: 1 }]) => ({
    id, name, category, kind: 'object', footprint,
    visual: { type: category === 'buildings' ? 'home' : category === 'nature' ? 'plant' : 'prop', colour },
});

function createStarterScene() {
    const placements = [];
    const width = 14;
    const height = 14;
    for (let gy = 0; gy < height; gy += 1) {
        for (let gx = 0; gx < width; gx += 1) placements.push({ assetId: 'grass', gx, gy });
    }
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    for (let gx = 1; gx < width - 1; gx += 1) placements.push({ assetId: 'path', gx, gy: midY });
    for (let gy = 1; gy < height - 1; gy += 1) placements.push({ assetId: 'path', gx: midX, gy });
    for (let gx = 0; gx < width; gx += 1) {
        placements.push({ assetId: 'water', gx, gy: height - 1 });
        placements.push({ assetId: 'water', gx, gy: height - 2 });
        placements.push({ assetId: 'sand', gx, gy: height - 3 });
    }
    placements.push(
        { assetId: 'house', gx: 2, gy: 2 },
        { assetId: 'main_chapel', gx: 7, gy: 1 },
        { assetId: 'windmill', gx: 11, gy: 2 },
        { assetId: 'two_story', gx: 2, gy: 7 },
        { assetId: 'villa', gx: 7, gy: 7 },
        { assetId: 'cypress', gx: 1, gy: 5 },
        { assetId: 'cypress', gx: 12, gy: 5 },
        { assetId: 'bougainvillea', gx: 5, gy: 3 },
        { assetId: 'olive', gx: 0, gy: 9 },
        { assetId: 'flower_pot', gx: 6, gy: 5 },
        { assetId: 'terracotta_pot', gx: 11, gy: 6 },
        { assetId: 'agave', gx: 13, gy: 8 },
        { assetId: 'lantern_post', gx: 4, gy: 6 },
        { assetId: 'lantern_post', gx: 9, gy: 6 },
        { assetId: 'small_bridge', gx: 5, gy: height - 2 },
    );
    return placements;
}

export const MYKONOS_UPSTREAM_COMMIT = 'ca5faeea84fc7dc8e18a6b8e899f432884dfe831';

export const mykonosRegressionWorld = defineWorld({
    id: 'mykonos-regression-v1',
    title: 'Mykonos Island Voxels — regression fixture',
    shortTitle: 'Mykonos fixture',
    source: {
        repository: 'boona13/mykonos-island-voxels',
        commit: MYKONOS_UPSTREAM_COMMIT,
        licence: 'MIT',
    },
    grid: { width: 14, height: 14 },
    tile: { w: 64, h: 32 },
    camera: { minZoom: 0.5, maxZoom: 3, defaultZoom: 1.4 },
    categories: ['terrain', 'nature', 'props', 'water', 'buildings'],
    assets: [
        ...terrain.map(T),
        ...nature.map((entry) => O('nature', '#5a8d6e', entry)),
        ...props.map((entry) => O('props', '#a89878', entry)),
        ...waterFeatures.map((entry) => O('water', '#4da8c4', entry)),
        ...buildings.map((entry) => O('buildings', '#fafaf5', entry)),
    ],
    behaviour: {
        fillTerrainId: 'grass',
        eraseOrder: ['object', 'terrain'],
        terrainReplacementKeepsObjects: true,
        controls: {
            place: 'click-or-tap',
            brush: 'drag',
            erase: 'right-click-or-long-press',
            pan: 'shift-drag-or-two-finger',
            zoom: 'wheel-or-pinch',
            flip: ['H', 'V'],
        },
    },
    storageKey: 'mykonos-island-voxels.save.v1',
    starterScene: createStarterScene(),
    theme: {
        page: '#f7edd8',
        panel: '#fffaf0',
        ink: '#243044',
        accent: '#1b5ba8',
        highlight: '#d85b8e',
        platform: '#f0e0bd',
        sky: '#f8e7c5',
    },
});
