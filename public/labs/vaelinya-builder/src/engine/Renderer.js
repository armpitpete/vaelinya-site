import { cellToScreen, screenToCellFloor } from './IsoGrid.js';

function shade(hex, amount) {
    const value = hex.replace('#', '');
    const number = Number.parseInt(value, 16);
    const r = Math.max(0, Math.min(255, (number >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (number & 255) + amount));
    return `rgb(${r}, ${g}, ${b})`;
}

function diamondPath(ctx, x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width / 2, y + height / 2);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x - width / 2, y + height / 2);
    ctx.closePath();
}

export class Renderer {
    constructor(canvas, world, tileMap, view) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.world = world;
        this.tileMap = tileMap;
        this.view = view;
        this.hoverCell = null;
        this.previewAssetId = null;
        this.previewValid = true;
        this.showGrid = false;
        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(canvas.parentElement ?? canvas);
        this.resize();
    }

    setTileMap(tileMap) {
        this.tileMap = tileMap;
        this.draw();
    }

    setWorld(world) {
        this.world = world;
        this.draw();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.draw();
    }

    worldOrigin() {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.width / 2 + this.view.offsetX,
            y: Math.max(42, rect.height * 0.13) + this.view.offsetY,
        };
    }

    eventToCell(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const origin = this.worldOrigin();
        const px = (clientX - rect.left - origin.x) / this.view.zoom;
        const py = (clientY - rect.top - origin.y) / this.view.zoom;
        return screenToCellFloor(px, py, this.world.tile);
    }

    cellToCanvas(gx, gy) {
        const origin = this.worldOrigin();
        const point = cellToScreen(gx, gy, this.world.tile);
        return {
            x: origin.x + point.x * this.view.zoom,
            y: origin.y + point.y * this.view.zoom,
        };
    }

    draw() {
        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        if (!width || !height) return;

        ctx.clearRect(0, 0, width, height);
        this._drawBackdrop(ctx, width, height);

        const origin = this.worldOrigin();
        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.scale(this.view.zoom, this.view.zoom);
        this._drawPlatform(ctx);
        this._drawTerrain(ctx);
        this._drawObjects(ctx);
        this._drawPreview(ctx);
        ctx.restore();
    }

    _drawBackdrop(ctx, width, height) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.world.theme.sky);
        gradient.addColorStop(1, this.world.theme.page);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = this.world.theme.accent;
        for (let y = 18; y < height; y += 28) {
            for (let x = (y / 28) % 2 ? 14 : 28; x < width; x += 42) {
                ctx.fillRect(x, y, 1, 1);
            }
        }
        ctx.globalAlpha = 1;
    }

    _drawPlatform(ctx) {
        const { width, height } = this.world.grid;
        const corners = [
            cellToScreen(0, 0, this.world.tile),
            cellToScreen(width, 0, this.world.tile),
            cellToScreen(width, height, this.world.tile),
            cellToScreen(0, height, this.world.tile),
        ];
        ctx.save();
        ctx.translate(0, 22);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(37, 42, 44, 0.18)';
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
        ctx.closePath();
        ctx.fillStyle = this.world.theme.platform;
        ctx.fill();
    }

    _drawTerrain(ctx) {
        if (!this.tileMap) return;
        for (let gy = 0; gy < this.tileMap.height; gy += 1) {
            for (let gx = 0; gx < this.tileMap.width; gx += 1) {
                const assetId = this.tileMap.getTerrain(gx, gy);
                if (!assetId) continue;
                const asset = this.world.assetIndex[assetId];
                this._drawTerrainCell(ctx, gx, gy, asset);
            }
        }
    }

    _drawTerrainCell(ctx, gx, gy, asset) {
        const position = cellToScreen(gx, gy, this.world.tile);
        const { w, h } = this.world.tile;
        const top = asset.visual?.top ?? '#a6aa9f';
        const side = asset.visual?.side ?? shade(top, -34);

        diamondPath(ctx, position.x, position.y, w, h);
        ctx.fillStyle = top;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(position.x - w / 2, position.y + h / 2);
        ctx.lineTo(position.x, position.y + h);
        ctx.lineTo(position.x, position.y + h + 8);
        ctx.lineTo(position.x - w / 2, position.y + h / 2 + 8);
        ctx.closePath();
        ctx.fillStyle = shade(side, -6);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(position.x, position.y + h);
        ctx.lineTo(position.x + w / 2, position.y + h / 2);
        ctx.lineTo(position.x + w / 2, position.y + h / 2 + 8);
        ctx.lineTo(position.x, position.y + h + 8);
        ctx.closePath();
        ctx.fillStyle = side;
        ctx.fill();

        if (asset.visual?.shimmer) {
            ctx.strokeStyle = asset.visual.shimmer;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(position.x - w * 0.18, position.y + h * 0.46);
            ctx.lineTo(position.x + w * 0.12, position.y + h * 0.31);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.showGrid) {
            diamondPath(ctx, position.x, position.y, w, h);
            ctx.strokeStyle = 'rgba(33, 45, 46, 0.22)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    _drawObjects(ctx) {
        if (!this.tileMap) return;
        const objects = [...this.tileMap.objects].sort((a, b) => a.sortKey() - b.sortKey() || a.id - b.id);
        for (const object of objects) {
            const asset = this.world.assetIndex[object.assetId];
            if (asset) this._drawObject(ctx, object, asset, 1);
        }
    }

    _objectAnchor(object) {
        const point = cellToScreen(object.gx, object.gy, this.world.tile);
        const width = (object.footprint.w + object.footprint.d) * this.world.tile.w / 2;
        const depth = (object.footprint.w + object.footprint.d) * this.world.tile.h / 2;
        return { x: point.x, y: point.y + depth / 2, width, depth };
    }

    _drawObject(ctx, object, asset, alpha = 1) {
        const anchor = this._objectAnchor(object);
        const visual = asset.visual ?? {};
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(anchor.x, anchor.y);
        if (object.flipH) ctx.scale(-1, 1);
        if (object.flipV) ctx.scale(1, -1);

        ctx.fillStyle = 'rgba(25, 35, 37, 0.18)';
        ctx.beginPath();
        ctx.ellipse(anchor.width * 0.12, 7, anchor.width * 0.34, Math.max(4, anchor.depth * 0.18), 0, 0, Math.PI * 2);
        ctx.fill();

        const type = visual.type ?? 'prop';
        if (type === 'plant') this._drawPlant(ctx, anchor, visual);
        else if (type === 'home') this._drawHome(ctx, anchor, visual);
        else if (type === 'listening') this._drawListeningPlace(ctx, anchor, visual);
        else if (type === 'riverbank') this._drawRiverbank(ctx, anchor, visual);
        else if (type === 'boat') this._drawBoat(ctx, anchor, visual);
        else if (type === 'landmark') this._drawLandmark(ctx, anchor, visual);
        else this._drawProp(ctx, anchor, visual);
        ctx.restore();
    }

    _drawPlant(ctx, anchor, visual) {
        const height = Math.max(24, anchor.width * 0.48);
        ctx.strokeStyle = visual.secondary ?? '#5f7f69';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-4, -height * 0.5, 0, -height);
        ctx.stroke();
        ctx.fillStyle = visual.colour ?? '#d8dfd3';
        for (const [dx, dy, radius] of [[-8, -height * 0.72, 8], [7, -height * 0.82, 7], [0, -height, 9]]) {
            ctx.beginPath();
            ctx.arc(dx, dy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawHome(ctx, anchor, visual) {
        const width = Math.max(44, anchor.width * 0.66);
        const bodyHeight = Math.max(34, anchor.depth * 1.65);
        ctx.fillStyle = visual.colour ?? '#c5b18d';
        ctx.fillRect(-width / 2, -bodyHeight, width, bodyHeight);
        ctx.fillStyle = shade(visual.colour ?? '#c5b18d', -28);
        ctx.beginPath();
        ctx.moveTo(-width / 2, -bodyHeight);
        ctx.lineTo(0, -bodyHeight - width * 0.28);
        ctx.lineTo(width / 2, -bodyHeight);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = visual.roof ?? '#735e78';
        ctx.beginPath();
        ctx.moveTo(-width / 2 - 4, -bodyHeight + 1);
        ctx.lineTo(0, -bodyHeight - width * 0.32);
        ctx.lineTo(width / 2 + 4, -bodyHeight + 1);
        ctx.lineTo(0, -bodyHeight - width * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = visual.door ?? '#4f7883';
        ctx.fillRect(-7, -23, 14, 23);
    }

    _drawListeningPlace(ctx, anchor, visual) {
        const radius = anchor.width * 0.31;
        ctx.strokeStyle = visual.colour ?? '#816aa0';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(0, -6, radius, radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = visual.secondary ?? '#d6cbe3';
        ctx.beginPath();
        ctx.arc(0, -radius * 0.48, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawRiverbank(ctx, anchor, visual) {
        const width = anchor.width * 0.8;
        ctx.fillStyle = visual.colour ?? '#909a99';
        ctx.fillRect(-width / 2, -12, width, 12);
        ctx.fillStyle = visual.secondary ?? '#c7cfcc';
        ctx.fillRect(-width / 2, -15, width, 4);
    }

    _drawBoat(ctx, anchor, visual) {
        const width = anchor.width * 0.82;
        ctx.fillStyle = visual.colour ?? '#6a5076';
        ctx.beginPath();
        ctx.moveTo(-width / 2, -10);
        ctx.quadraticCurveTo(0, 12, width / 2, -10);
        ctx.lineTo(width * 0.35, 1);
        ctx.quadraticCurveTo(0, 20, -width * 0.35, 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = visual.secondary ?? '#d8b46a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, -42);
        ctx.stroke();
    }

    _drawLandmark(ctx, anchor, visual) {
        const height = Math.max(76, anchor.width * 0.75);
        ctx.fillStyle = visual.colour ?? '#755c91';
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-7, -height);
        ctx.lineTo(7, -height);
        ctx.lineTo(18, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = visual.secondary ?? '#d4bf79';
        ctx.beginPath();
        ctx.arc(0, -height - 8, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawProp(ctx, anchor, visual) {
        const size = Math.max(16, anchor.width * 0.3);
        ctx.fillStyle = visual.colour ?? '#a89878';
        ctx.fillRect(-size / 2, -size, size, size);
    }

    _drawPreview(ctx) {
        if (!this.tileMap) return;
        if (!this.hoverCell || !this.tileMap.inBounds(this.hoverCell.gx, this.hoverCell.gy)) return;
        const position = cellToScreen(this.hoverCell.gx, this.hoverCell.gy, this.world.tile);
        const { w, h } = this.world.tile;
        diamondPath(ctx, position.x, position.y, w, h);
        ctx.fillStyle = this.previewValid ? 'rgba(75, 132, 127, 0.32)' : 'rgba(174, 67, 73, 0.34)';
        ctx.fill();
        ctx.strokeStyle = this.previewValid ? this.world.theme.focus ?? this.world.theme.accent : '#9c2938';
        ctx.lineWidth = 2;
        ctx.stroke();

        const asset = this.world.assetIndex[this.previewAssetId];
        if (asset?.kind === 'object') {
            const previewObject = {
                id: -1,
                assetId: asset.id,
                gx: this.hoverCell.gx,
                gy: this.hoverCell.gy,
                footprint: asset.footprint,
                flipH: false,
                flipV: false,
            };
            this._drawObject(ctx, previewObject, asset, this.previewValid ? 0.56 : 0.25);
        }
    }
}
