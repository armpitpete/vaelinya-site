export function assertTileSize(tile) {
    if (!tile || !Number.isFinite(tile.w) || !Number.isFinite(tile.h) || tile.w <= 0 || tile.h <= 0) {
        throw new TypeError('tile must contain positive finite w and h values');
    }
}

export function cellToScreen(gx, gy, tile) {
    assertTileSize(tile);
    return {
        x: (gx - gy) * (tile.w / 2),
        y: (gx + gy) * (tile.h / 2),
    };
}

export function screenToCell(px, py, tile) {
    assertTileSize(tile);
    return {
        gx: (px / (tile.w / 2) + py / (tile.h / 2)) / 2,
        gy: (py / (tile.h / 2) - px / (tile.w / 2)) / 2,
    };
}

export function screenToCellFloor(px, py, tile) {
    const cell = screenToCell(px, py, tile);
    return { gx: Math.floor(cell.gx), gy: Math.floor(cell.gy) };
}

export function cellInBounds(gx, gy, width, height) {
    return Number.isInteger(gx)
        && Number.isInteger(gy)
        && gx >= 0
        && gy >= 0
        && gx < width
        && gy < height;
}

export function footprintCells(gx, gy, footprint) {
    const cells = [];
    for (let dx = 0; dx < footprint.w; dx += 1) {
        for (let dy = 0; dy < footprint.d; dy += 1) {
            cells.push({ gx: gx + dx, gy: gy + dy });
        }
    }
    return cells;
}

export function orthogonalNeighbours(gx, gy) {
    return [
        { gx: gx - 1, gy },
        { gx: gx + 1, gy },
        { gx, gy: gy - 1 },
        { gx, gy: gy + 1 },
    ];
}
