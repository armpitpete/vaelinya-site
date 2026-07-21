import { defineWorld } from '../engine/WorldDefinition.js';

const LAND = ['vaelinya-meadow', 'vaelinya-soft-earth'];

export const vaelinyaWorld = defineWorld({
    id: 'vaelinya-builder-prototype-v1',
    title: 'A Small Place in Vaelinya',
    shortTitle: 'Vaelinya Builder',
    grid: { width: 12, height: 12 },
    tile: { w: 72, h: 36 },
    camera: { minZoom: 0.55, maxZoom: 2.5, defaultZoom: 1.05 },
    categories: ['terrain', 'plants', 'homes', 'shared', 'river', 'landmark'],
    assets: [
        {
            id: 'vaelinya-meadow', name: 'Soft Meadow', category: 'terrain', kind: 'terrain',
            footprint: { w: 1, d: 1 }, visual: { type: 'terrain', top: '#9cbf8c', side: '#66866a' },
        },
        {
            id: 'vaelinya-stone-path', name: 'Listening Stone', category: 'terrain', kind: 'terrain',
            footprint: { w: 1, d: 1 }, visual: { type: 'terrain', top: '#aeb5b7', side: '#727d82' },
        },
        {
            id: 'vaelinya-river', name: 'River Water', category: 'terrain', kind: 'terrain',
            footprint: { w: 1, d: 1 }, visual: { type: 'terrain', top: '#5babc2', side: '#3b718b', shimmer: '#c7edf0' },
        },
        {
            id: 'vaelinya-soft-earth', name: 'Warm Earth', category: 'terrain', kind: 'terrain',
            footprint: { w: 1, d: 1 }, visual: { type: 'terrain', top: '#b79778', side: '#7c6455' },
        },
        {
            id: 'silver-grass', name: 'Silver Grass', category: 'plants', kind: 'object',
            footprint: { w: 1, d: 1 }, rules: { requiresTerrain: true, allowedTerrain: LAND },
            visual: { type: 'plant', colour: '#d9e1d8', secondary: '#809d90' },
        },
        {
            id: 'listening-bell-flower', name: 'Listening Bell Flower', category: 'plants', kind: 'object',
            footprint: { w: 1, d: 1 }, rules: { requiresTerrain: true, allowedTerrain: LAND },
            visual: { type: 'plant', colour: '#8f77b5', secondary: '#d5cbe8' },
        },
        {
            id: 'woven-home', name: 'Woven Home', category: 'homes', kind: 'object',
            footprint: { w: 2, d: 2 }, rules: { requiresTerrain: true, allowedTerrain: LAND },
            visual: { type: 'home', colour: '#d5a46e', roof: '#79607e', door: '#4f7883' },
        },
        {
            id: 'river-stone-home', name: 'River-Stone Home', category: 'homes', kind: 'object',
            footprint: { w: 2, d: 2 }, rules: { requiresTerrain: true, allowedTerrain: LAND },
            visual: { type: 'home', colour: '#9aa8a8', roof: '#5e7480', door: '#c5a76b' },
        },
        {
            id: 'listening-circle', name: 'Shared Listening Place', category: 'shared', kind: 'object',
            footprint: { w: 3, d: 3 }, rules: { requiresTerrain: true, allowedTerrain: LAND, uniquePerWorld: true },
            visual: { type: 'listening', colour: '#8675a8', secondary: '#d8cde6' },
        },
        {
            id: 'riverbank-step', name: 'Riverbank Step', category: 'river', kind: 'object',
            footprint: { w: 1, d: 1 },
            rules: { requiresTerrain: true, allowedTerrain: [...LAND, 'vaelinya-stone-path'], requiresAdjacentTerrain: ['vaelinya-river'] },
            visual: { type: 'riverbank', colour: '#8f9796', secondary: '#c2cbc8' },
        },
        {
            id: 'rimaeri-boat', name: 'Rimaeri Boat', category: 'river', kind: 'object',
            footprint: { w: 1, d: 1 }, rules: { requiresTerrain: true, allowedTerrain: ['vaelinya-river'] },
            visual: { type: 'boat', colour: '#694f73', secondary: '#d8b46a' },
        },
        {
            id: 'navan-marker', name: 'Navan Marker', category: 'landmark', kind: 'object',
            footprint: { w: 2, d: 2 }, rules: { requiresTerrain: true, allowedTerrain: LAND, uniquePerWorld: true },
            visual: { type: 'landmark', colour: '#765b92', secondary: '#d4bf79' },
        },
    ],
    behaviour: {
        fillTerrainId: 'vaelinya-meadow',
        eraseOrder: ['object', 'terrain'],
        terrainReplacementKeepsObjects: true,
        autosaveDelayMs: 250,
    },
    starterScene: [
        ...Array.from({ length: 12 * 12 }, (_, index) => ({
            assetId: 'vaelinya-meadow', gx: index % 12, gy: Math.floor(index / 12),
        })),
        ...Array.from({ length: 12 }, (_, gx) => ({ assetId: 'vaelinya-river', gx, gy: 7 })),
        ...Array.from({ length: 12 }, (_, gx) => ({ assetId: 'vaelinya-river', gx, gy: 8 })),
        ...Array.from({ length: 8 }, (_, offset) => ({ assetId: 'vaelinya-stone-path', gx: 2 + offset, gy: 4 })),
        { assetId: 'vaelinya-soft-earth', gx: 1, gy: 2 },
        { assetId: 'vaelinya-soft-earth', gx: 2, gy: 2 },
        { assetId: 'vaelinya-soft-earth', gx: 1, gy: 3 },
        { assetId: 'vaelinya-soft-earth', gx: 2, gy: 3 },
        { assetId: 'woven-home', gx: 1, gy: 2 },
        { assetId: 'river-stone-home', gx: 8, gy: 1 },
        { assetId: 'silver-grass', gx: 4, gy: 2 },
        { assetId: 'listening-bell-flower', gx: 6, gy: 2 },
        { assetId: 'listening-circle', gx: 4, gy: 4 },
        { assetId: 'riverbank-step', gx: 3, gy: 6 },
        { assetId: 'rimaeri-boat', gx: 5, gy: 7 },
        { assetId: 'navan-marker', gx: 9, gy: 9 },
    ],
    theme: {
        page: '#ece8de',
        panel: '#f7f3e9',
        ink: '#283738',
        accent: '#674e86',
        highlight: '#3f7e86',
        platform: '#cfc4ad',
        sky: '#dce4df',
        focus: '#1f5d67',
    },
});
