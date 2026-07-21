import { PlacedObject } from './PlacedObject.js';

export class TileMap {
    constructor(width, height) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
            throw new TypeError('TileMap dimensions must be positive integers');
        }
        this.width = width;
        this.height = height;
        this.terrain = new Array(width * height).fill(null);
        this.objects = [];
        this._occupancy = new Array(width * height).fill(null);
        this._nextId = 1;
        this.terrainVersion = 0;
        this.objectsVersion = 0;
    }

    nextId() {
        const id = this._nextId;
        this._nextId += 1;
        return id;
    }

    inBounds(gx, gy) {
        return Number.isInteger(gx)
            && Number.isInteger(gy)
            && gx >= 0
            && gy >= 0
            && gx < this.width
            && gy < this.height;
    }

    index(gx, gy) {
        return gy * this.width + gx;
    }

    setTerrain(gx, gy, assetId) {
        if (!this.inBounds(gx, gy)) return false;
        const index = this.index(gx, gy);
        if (this.terrain[index] === assetId) return false;
        this.terrain[index] = assetId;
        this.terrainVersion += 1;
        return true;
    }

    getTerrain(gx, gy) {
        if (!this.inBounds(gx, gy)) return null;
        return this.terrain[this.index(gx, gy)];
    }

    clearTerrain(gx, gy) {
        return this.setTerrain(gx, gy, null);
    }

    objectAt(gx, gy) {
        if (!this.inBounds(gx, gy)) return null;
        return this._occupancy[this.index(gx, gy)] ?? null;
    }

    isFreeFor(gx, gy, width, depth) {
        for (let dx = 0; dx < width; dx += 1) {
            for (let dy = 0; dy < depth; dy += 1) {
                const cx = gx + dx;
                const cy = gy + dy;
                if (!this.inBounds(cx, cy) || this.objectAt(cx, cy)) return false;
            }
        }
        return true;
    }

    countAsset(assetId) {
        return this.objects.reduce((count, object) => count + (object.assetId === assetId ? 1 : 0), 0);
    }

    addObject(object) {
        if (!(object instanceof PlacedObject)) throw new TypeError('addObject expects a PlacedObject');
        if (!this.isFreeFor(object.gx, object.gy, object.footprint.w, object.footprint.d)) return false;
        this.objects.push(object);
        this._stampOccupancy(object, object);
        this._nextId = Math.max(this._nextId, object.id + 1);
        this.objectsVersion += 1;
        return true;
    }

    removeObjectAt(gx, gy) {
        const target = this.objectAt(gx, gy);
        if (!target) return null;
        const index = this.objects.indexOf(target);
        if (index < 0) return null;
        this.objects.splice(index, 1);
        this._stampOccupancy(target, null);
        this.objectsVersion += 1;
        return target;
    }

    clearAll() {
        this.terrain.fill(null);
        this.objects.length = 0;
        this._occupancy.fill(null);
        this._nextId = 1;
        this.terrainVersion += 1;
        this.objectsVersion += 1;
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            terrain: [...this.terrain],
            objects: this.objects.map((object) => object.serialize()),
        };
    }

    deserialize(data, objectFactory = (entry) => new PlacedObject(entry)) {
        if (!data || !Number.isInteger(data.width) || !Number.isInteger(data.height)) {
            throw new TypeError('Invalid tile map snapshot');
        }
        this.width = data.width;
        this.height = data.height;
        this.terrain = [...data.terrain];
        this.objects = [];
        this._occupancy = new Array(this.width * this.height).fill(null);

        for (const entry of data.objects ?? []) {
            const object = objectFactory(entry);
            if (!this.addObject(object)) throw new Error(`Object ${object.id} overlaps or is out of bounds`);
        }

        const highestId = this.objects.reduce((highest, object) => Math.max(highest, object.id), 0);
        this._nextId = highestId + 1;
        this.terrainVersion += 1;
        this.objectsVersion += 1;
        return this;
    }

    static fromSnapshot(snapshot, objectFactory) {
        return new TileMap(snapshot.width, snapshot.height).deserialize(snapshot, objectFactory);
    }

    _stampOccupancy(object, value) {
        for (let dx = 0; dx < object.footprint.w; dx += 1) {
            for (let dy = 0; dy < object.footprint.d; dy += 1) {
                const gx = object.gx + dx;
                const gy = object.gy + dy;
                if (this.inBounds(gx, gy)) this._occupancy[this.index(gx, gy)] = value;
            }
        }
    }
}
