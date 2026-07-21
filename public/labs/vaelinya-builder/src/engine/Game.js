import { TileMap } from './TileMap.js';
import { PlacementSystem } from './PlacementSystem.js';
import { BrowserSaveStore } from './SaveSystem.js';

export class Game {
    constructor({ world, renderer, storage = window.localStorage, onChange = () => {}, onMessage = () => {} }) {
        this.world = world;
        this.tileMap = new TileMap(world.grid.width, world.grid.height);
        this.view = renderer.view;
        this.renderer = renderer;
        this.renderer.setTileMap(this.tileMap);
        this.placement = new PlacementSystem(this.tileMap, world);
        this.saveStore = new BrowserSaveStore({ storage, world });
        this.onChange = onChange;
        this.onMessage = onMessage;
        this.tool = 'place';
        this.category = world.categories[0];
        this.selectedAssetId = world.assets.find((asset) => asset.category === this.category)?.id ?? world.assets[0].id;
        this._saveTimer = null;
        this._createdAt = null;
    }

    initialise() {
        const loaded = this.load();
        if (!loaded.ok) {
            this.seedStarterScene();
            this.centerView();
            this.renderer.draw();
            this.onMessage(loaded.empty ? 'A new place is ready.' : 'The saved place was invalid, so a fresh one was opened.');
        } else {
            this.onMessage(loaded.migratedFrom ? 'The older save was safely upgraded.' : 'Saved place restored.');
        }
        this._notify();
    }

    centerView() {
        this.view.offsetX = 0;
        this.view.offsetY = 0;
        this.view.zoom = this.world.camera.defaultZoom;
    }

    setTool(tool) {
        if (!['place', 'erase', 'pan'].includes(tool)) return;
        this.tool = tool;
        this._notify();
    }

    setCategory(category) {
        if (!this.world.categories.includes(category)) return;
        this.category = category;
        const first = this.world.assets.find((asset) => asset.category === category);
        if (first) this.selectedAssetId = first.id;
        this.tool = 'place';
        this.updateHover(this.renderer.hoverCell);
        this._notify();
    }

    selectAsset(assetId) {
        const asset = this.world.assetIndex[assetId];
        if (!asset) return;
        this.selectedAssetId = assetId;
        this.category = asset.category;
        this.tool = 'place';
        this.updateHover(this.renderer.hoverCell);
        this._notify();
    }

    updateHover(cell) {
        this.renderer.hoverCell = cell;
        this.renderer.previewAssetId = this.tool === 'place' ? this.selectedAssetId : null;
        if (!cell) this.renderer.previewValid = false;
        else if (this.tool === 'place') this.renderer.previewValid = this.placement.canPlace(this.selectedAssetId, cell.gx, cell.gy).ok;
        else if (this.tool === 'erase') this.renderer.previewValid = Boolean(this.tileMap.objectAt(cell.gx, cell.gy) || this.tileMap.getTerrain(cell.gx, cell.gy));
        else this.renderer.previewValid = true;
        this.renderer.draw();
    }

    actAt(gx, gy) {
        if (this.tool === 'erase') return this.eraseAt(gx, gy);
        if (this.tool === 'place') return this.placeAt(gx, gy);
        return { ok: false, code: 'pan_tool_active' };
    }

    placeAt(gx, gy, assetId = this.selectedAssetId) {
        const result = this.placement.place(assetId, gx, gy);
        if (!result.ok) {
            this.onMessage(result.message ?? 'That piece cannot go there.');
            this.updateHover({ gx, gy });
            return result;
        }
        this._afterMutation();
        return result;
    }

    eraseAt(gx, gy) {
        const result = this.placement.erase(gx, gy);
        if (!result.ok) this.onMessage('There is nothing here to remove.');
        else this._afterMutation();
        return result;
    }

    fillTerrain() {
        const assetId = this.world.behaviour?.fillTerrainId;
        if (!assetId) return 0;
        let changed = 0;
        for (let gy = 0; gy < this.tileMap.height; gy += 1) {
            for (let gx = 0; gx < this.tileMap.width; gx += 1) {
                if (this.tileMap.getTerrain(gx, gy)) continue;
                if (this.placement.place(assetId, gx, gy).ok) changed += 1;
            }
        }
        if (changed) this._afterMutation();
        return changed;
    }

    toggleGrid() {
        this.renderer.showGrid = !this.renderer.showGrid;
        this.renderer.draw();
        this._notify();
    }

    seedStarterScene() {
        this.tileMap.clearAll();
        for (const placement of this.world.starterScene ?? []) {
            this.placement.place(placement.assetId, placement.gx, placement.gy, placement.options ?? {});
        }
    }

    reset() {
        this.saveStore.clear();
        this._createdAt = null;
        this.seedStarterScene();
        this.centerView();
        this.renderer.draw();
        this._notify();
        this.onMessage('The starter place has been restored.');
    }

    save() {
        const result = this.saveStore.save(this.tileMap, this.view, this.uiState(), this._createdAt);
        if (result.ok) {
            this._createdAt = result.value.createdAt;
            this.onMessage('Saved.');
        } else {
            this.onMessage('Save failed validation.');
        }
        return result;
    }

    load() {
        const result = this.saveStore.load();
        if (!result.ok) return result;
        this.tileMap = result.tileMap;
        this.placement = new PlacementSystem(this.tileMap, this.world);
        Object.assign(this.view, result.view);
        this.tool = result.ui.tool ?? 'place';
        if (this.world.assetIndex[result.ui.selectedAssetId]) this.selectedAssetId = result.ui.selectedAssetId;
        if (this.world.categories.includes(result.ui.category)) this.category = result.ui.category;
        this._createdAt = result.value.createdAt;
        this.renderer.setTileMap(this.tileMap);
        this.renderer.draw();
        return result;
    }

    uiState() {
        return {
            selectedAssetId: this.selectedAssetId,
            category: this.category,
            tool: this.tool,
        };
    }

    snapshot() {
        return {
            worldId: this.world.id,
            assetCount: this.world.assets.length,
            terrainCount: this.tileMap.terrain.filter(Boolean).length,
            objectCount: this.tileMap.objects.length,
            selectedAssetId: this.selectedAssetId,
            category: this.category,
            tool: this.tool,
            zoom: this.view.zoom,
        };
    }

    _afterMutation() {
        this.renderer.draw();
        this.updateHover(this.renderer.hoverCell);
        this._notify();
        this._scheduleAutosave();
    }

    _scheduleAutosave() {
        window.clearTimeout(this._saveTimer);
        const delay = this.world.behaviour?.autosaveDelayMs ?? 350;
        this._saveTimer = window.setTimeout(() => this.save(), delay);
    }

    _notify() {
        this.onChange(this.snapshot());
    }
}
