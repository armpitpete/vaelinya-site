import { Game } from './engine/Game.js';
import { InputManager } from './engine/InputManager.js';
import { Renderer } from './engine/Renderer.js';
import { mykonosRegressionWorld } from './worlds/mykonos.fixture.js';
import { vaelinyaWorld } from './worlds/vaelinya.js';

const worlds = {
    vaelinya: vaelinyaWorld,
    mykonos: mykonosRegressionWorld,
};

const params = new URLSearchParams(window.location.search);
const worldKey = params.get('world') === 'mykonos' ? 'mykonos' : 'vaelinya';
const world = worlds[worldKey];

const root = document.documentElement;
for (const [name, value] of Object.entries(world.theme)) root.style.setProperty(`--${name}`, value);

document.title = `${world.shortTitle} — theme-neutral prototype`;
document.querySelector('[data-world-title]').textContent = world.title;
document.querySelector('[data-world-subtitle]').textContent = worldKey === 'vaelinya'
    ? 'Arrange a small shared place. There is no score and no resource grind.'
    : `Regression fixture for ${world.source.repository} at ${world.source.commit.slice(0, 12)}.`;

document.querySelector('[data-world-switch]').href = worldKey === 'vaelinya' ? '?world=mykonos' : '?world=vaelinya';
document.querySelector('[data-world-switch]').textContent = worldKey === 'vaelinya' ? 'Open Mykonos fixture' : 'Return to Vaelinya';

const canvas = document.querySelector('#builder-canvas');
const view = { offsetX: 0, offsetY: 0, zoom: world.camera.defaultZoom };
const renderer = new Renderer(canvas, world, null, view);

function resolveStorage() {
    try {
        const storage = window.localStorage;
        const probe = '__isometric_builder_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return storage;
    } catch {
        const values = new Map();
        return {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: (key) => values.delete(key),
        };
    }
}

const status = document.querySelector('[data-status]');
const selection = document.querySelector('[data-selection]');
const counts = document.querySelector('[data-counts]');

const game = new Game({
    world,
    renderer,
    storage: resolveStorage(),
    onChange: updateInterface,
    onMessage: (message) => {
        status.textContent = message;
        status.dataset.active = 'true';
        window.clearTimeout(status._timer);
        status._timer = window.setTimeout(() => { status.dataset.active = 'false'; }, 2400);
    },
});
new InputManager(canvas, game);

function updateInterface(snapshot = game.snapshot()) {
    document.querySelectorAll('[data-tool]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.tool === snapshot.tool));
    });
    document.querySelector('[data-tool="grid"]').setAttribute('aria-pressed', String(renderer.showGrid));
    document.querySelectorAll('[data-category]').forEach((button) => {
        button.setAttribute('aria-selected', String(button.dataset.category === snapshot.category));
    });
    document.querySelectorAll('[data-asset-id]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.assetId === snapshot.selectedAssetId));
    });
    const asset = world.assetIndex[snapshot.selectedAssetId];
    selection.textContent = asset ? `Selected: ${asset.name}` : 'No asset selected';
    counts.textContent = `${snapshot.terrainCount} terrain · ${snapshot.objectCount} objects · ${snapshot.assetCount} available pieces`;
}

function buildCategories() {
    const container = document.querySelector('[data-categories]');
    container.replaceChildren();
    for (const category of world.categories) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-tab';
        button.dataset.category = category;
        button.setAttribute('role', 'tab');
        button.textContent = category.replaceAll('_', ' ');
        button.addEventListener('click', () => {
            game.setCategory(category);
            buildPalette();
        });
        container.append(button);
    }
}

function visualSwatch(asset) {
    const swatch = document.createElement('span');
    swatch.className = `asset-swatch asset-swatch--${asset.visual?.type ?? asset.kind}`;
    swatch.style.setProperty('--swatch', asset.visual?.top ?? asset.visual?.colour ?? world.theme.accent);
    swatch.style.setProperty('--swatch-two', asset.visual?.secondary ?? asset.visual?.side ?? world.theme.highlight);
    swatch.setAttribute('aria-hidden', 'true');
    return swatch;
}

function buildPalette() {
    const container = document.querySelector('[data-palette]');
    container.replaceChildren();
    for (const asset of world.assets.filter((entry) => entry.category === game.category)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'asset-button';
        button.dataset.assetId = asset.id;
        button.setAttribute('aria-pressed', String(asset.id === game.selectedAssetId));
        button.append(visualSwatch(asset));
        const label = document.createElement('span');
        label.textContent = asset.name;
        button.append(label);
        button.addEventListener('click', () => game.selectAsset(asset.id));
        container.append(button);
    }
    updateInterface();
}

document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
        const tool = button.dataset.tool;
        if (tool === 'fill') game.fillTerrain();
        else if (tool === 'grid') game.toggleGrid();
        else if (tool === 'save') game.save();
        else if (tool === 'reset') game.reset();
        else game.setTool(tool);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'e') game.setTool(game.tool === 'erase' ? 'place' : 'erase');
    if (event.key.toLowerCase() === 'g') game.toggleGrid();
    if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        game.save();
    }
});

buildCategories();
buildPalette();
game.initialise();

window.__builder = {
    game,
    world,
    place(assetId, gx, gy) { return game.placeAt(gx, gy, assetId); },
    erase(gx, gy) { return game.eraseAt(gx, gy); },
    save() { return game.save(); },
    reset() { return game.reset(); },
    proofSnapshot() {
        const stage = document.querySelector('.stage').getBoundingClientRect();
        const palette = document.querySelector('.palette-panel').getBoundingClientRect();
        return {
            ready: true,
            worldId: world.id,
            assetCount: world.assets.length,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
            canvas: { width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height },
            stage: { width: stage.width, height: stage.height },
            palette: { width: palette.width, height: palette.height },
            snapshot: game.snapshot(),
        };
    },
};
