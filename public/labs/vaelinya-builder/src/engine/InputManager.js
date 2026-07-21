export class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.pointers = new Map();
        this.drag = null;
        this.longPressTimer = null;
        this.lastPinchDistance = null;
        canvas.style.touchAction = 'none';
        canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
        canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
        canvas.addEventListener('pointerup', (event) => this.pointerUp(event));
        canvas.addEventListener('pointercancel', (event) => this.pointerUp(event));
        canvas.addEventListener('pointerleave', () => this.game.updateHover(null));
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        canvas.addEventListener('wheel', (event) => this.wheel(event), { passive: false });
    }

    pointerDown(event) {
        this.canvas.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const cell = this.game.renderer.eventToCell(event.clientX, event.clientY);
        this.game.updateHover(cell);

        if (event.button === 2) {
            event.preventDefault();
            this.game.eraseAt(cell.gx, cell.gy);
            return;
        }

        if (this.pointers.size === 2) {
            this.clearLongPress();
            this.lastPinchDistance = this.pointerDistance();
            return;
        }

        this.drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            moved: false,
            pan: this.game.tool === 'pan' || event.shiftKey || event.button === 1,
        };

        if (event.pointerType === 'touch' && !this.drag.pan) {
            this.longPressTimer = window.setTimeout(() => {
                const current = this.pointers.get(event.pointerId);
                if (!current || this.drag?.moved) return;
                const target = this.game.renderer.eventToCell(current.x, current.y);
                this.game.eraseAt(target.gx, target.gy);
                this.drag.longPressed = true;
            }, 440);
        }
    }

    pointerMove(event) {
        if (!this.pointers.has(event.pointerId)) {
            this.game.updateHover(this.game.renderer.eventToCell(event.clientX, event.clientY));
            return;
        }

        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size === 2) {
            this.clearLongPress();
            const distance = this.pointerDistance();
            if (this.lastPinchDistance) {
                const factor = distance / this.lastPinchDistance;
                this.game.view.zoom = Math.max(
                    this.game.world.camera.minZoom,
                    Math.min(this.game.world.camera.maxZoom, this.game.view.zoom * factor),
                );
                this.game.renderer.draw();
            }
            this.lastPinchDistance = distance;
            return;
        }

        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - this.drag.lastX;
        const dy = event.clientY - this.drag.lastY;
        const total = Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY);
        if (total > 7) {
            this.drag.moved = true;
            this.clearLongPress();
        }

        if (this.drag.pan) {
            this.game.view.offsetX += dx;
            this.game.view.offsetY += dy;
            this.game.renderer.draw();
        } else if (this.drag.moved && event.pointerType === 'mouse' && event.buttons === 1) {
            const cell = this.game.renderer.eventToCell(event.clientX, event.clientY);
            this.game.updateHover(cell);
            this.game.actAt(cell.gx, cell.gy);
        }
        this.drag.lastX = event.clientX;
        this.drag.lastY = event.clientY;
    }

    pointerUp(event) {
        const current = this.pointers.get(event.pointerId);
        this.pointers.delete(event.pointerId);
        this.clearLongPress();
        if (this.pointers.size < 2) this.lastPinchDistance = null;

        if (this.drag?.pointerId === event.pointerId) {
            if (!this.drag.moved && !this.drag.longPressed && current && event.button !== 2) {
                const cell = this.game.renderer.eventToCell(current.x, current.y);
                this.game.actAt(cell.gx, cell.gy);
            }
            this.drag = null;
        }
    }

    wheel(event) {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1.1 : 0.9;
        this.game.view.zoom = Math.max(
            this.game.world.camera.minZoom,
            Math.min(this.game.world.camera.maxZoom, this.game.view.zoom * direction),
        );
        this.game.renderer.draw();
    }

    pointerDistance() {
        const [first, second] = [...this.pointers.values()];
        if (!first || !second) return 0;
        return Math.hypot(first.x - second.x, first.y - second.y);
    }

    clearLongPress() {
        if (this.longPressTimer) window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }
}
