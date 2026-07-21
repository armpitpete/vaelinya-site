export class PlacedObject {
    constructor({
        id,
        assetId,
        gx,
        gy,
        footprint,
        rotation = 0,
        flipH = false,
        flipV = false,
        metadata = {},
    }) {
        this.id = id;
        this.assetId = assetId;
        this.gx = gx;
        this.gy = gy;
        this.footprint = { ...footprint };
        this.rotation = rotation;
        this.flipH = Boolean(flipH);
        this.flipV = Boolean(flipV);
        this.metadata = { ...metadata };
    }

    occupies(gx, gy) {
        return gx >= this.gx
            && gx < this.gx + this.footprint.w
            && gy >= this.gy
            && gy < this.gy + this.footprint.d;
    }

    sortKey() {
        return (this.gx + this.footprint.w - 1) + (this.gy + this.footprint.d - 1);
    }

    serialize() {
        return {
            id: this.id,
            assetId: this.assetId,
            gx: this.gx,
            gy: this.gy,
            footprint: { ...this.footprint },
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV,
            metadata: { ...this.metadata },
        };
    }
}
