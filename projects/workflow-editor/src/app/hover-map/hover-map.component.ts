import {AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, Signal, viewChild} from '@angular/core';
import {first, map} from 'rxjs/operators';
import {AsyncValueDefault, Layer, UserService} from '@geoengine/common';
import {MatIcon} from '@angular/material/icon';
import {
    BackendService,
    MapContainerComponent,
    MapService,
    OlRasterLayerComponent,
    OlVectorLayerComponent,
    ProjectService,
} from '@geoengine/core';
import {Observable} from 'rxjs';
import {AsyncPipe} from '@angular/common';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

@Component({
    selector: 'geoengine-hover-map',
    imports: [
        MapContainerComponent,
        AsyncPipe,
        OlVectorLayerComponent,
        OlRasterLayerComponent,
        MapContainerComponent,
        AsyncValueDefault,
        MatIcon,
    ],
    templateUrl: './hover-map.component.html',
    styleUrl: './hover-map.component.scss',
})
export class HoverMapComponent implements OnInit, AfterViewInit, OnDestroy {
    readonly userService = inject(UserService);
    readonly projectService: ProjectService = inject(ProjectService);
    readonly mapService: MapService = inject(MapService);
    readonly backend: BackendService = inject(BackendService);
    readonly layersReverse$: Observable<Array<Layer>>;
    readonly mapIsGrid$: Observable<boolean>;
    readonly mapComponent: Signal<MapContainerComponent> = viewChild.required(MapContainerComponent);
    readonly hoverMapContainer: Signal<ElementRef<HTMLDivElement>> = viewChild.required('hoverMapContainer');

    hoverMapWidthPx?: number;
    hoverMapHeightPx?: number;
    hoverMapLeftPx?: number;
    hoverMapTopPx?: number;

    private readonly minWidthPx = 240;
    private readonly minHeightPx = 180;
    private readonly marginPx = 16;

    private isResizing = false;
    private isDragging = false;
    private activeResizeDirection?: ResizeDirection;
    private startPointerX = 0;
    private startPointerY = 0;
    private startWidthPx = 0;
    private startHeightPx = 0;
    private startLeftPx = 0;
    private startTopPx = 0;

    private readonly pointerMoveListener = (event: PointerEvent): void => {
        if (!this.isResizing && !this.isDragging) {
            return;
        }

        const pointerDeltaX = event.clientX - this.startPointerX;
        const pointerDeltaY = event.clientY - this.startPointerY;

        const containingBlock = this.getContainingBlock();
        if (this.isResizing) {
            const direction = this.activeResizeDirection;
            if (!direction) {
                return;
            }

            let nextLeftPx = this.startLeftPx;
            let nextTopPx = this.startTopPx;
            let nextWidthPx = this.startWidthPx;
            let nextHeightPx = this.startHeightPx;

            if (direction.includes('w')) {
                const maxLeftPx = this.startLeftPx + this.startWidthPx - this.minWidthPx;
                nextLeftPx = this.clamp(this.startLeftPx + pointerDeltaX, this.marginPx, maxLeftPx);
                nextWidthPx = this.startWidthPx + (this.startLeftPx - nextLeftPx);
            }

            if (direction.includes('e')) {
                const maxWidthPx = containingBlock.clientWidth - this.startLeftPx - this.marginPx;
                nextWidthPx = this.clamp(this.startWidthPx + pointerDeltaX, this.minWidthPx, maxWidthPx);
            }

            if (direction.includes('n')) {
                const maxTopPx = this.startTopPx + this.startHeightPx - this.minHeightPx;
                nextTopPx = this.clamp(this.startTopPx + pointerDeltaY, this.marginPx, maxTopPx);
                nextHeightPx = this.startHeightPx + (this.startTopPx - nextTopPx);
            }

            if (direction.includes('s')) {
                const maxHeightPx = containingBlock.clientHeight - this.startTopPx - this.marginPx;
                nextHeightPx = this.clamp(this.startHeightPx + pointerDeltaY, this.minHeightPx, maxHeightPx);
            }

            this.hoverMapLeftPx = nextLeftPx;
            this.hoverMapTopPx = nextTopPx;
            this.hoverMapWidthPx = nextWidthPx;
            this.hoverMapHeightPx = nextHeightPx;
            this.mapComponent().resize();
        }

        if (this.isDragging) {
            if (this.hoverMapWidthPx === undefined || this.hoverMapHeightPx === undefined) {
                return;
            }

            const maxLeftPx = containingBlock.clientWidth - this.hoverMapWidthPx - this.marginPx;
            const maxTopPx = containingBlock.clientHeight - this.hoverMapHeightPx - this.marginPx;
            const boundedMaxLeftPx = Math.max(this.marginPx, maxLeftPx);
            const boundedMaxTopPx = Math.max(this.marginPx, maxTopPx);

            this.hoverMapLeftPx = this.clamp(this.startLeftPx + pointerDeltaX, this.marginPx, boundedMaxLeftPx);
            this.hoverMapTopPx = this.clamp(this.startTopPx + pointerDeltaY, this.marginPx, boundedMaxTopPx);
        }
    };

    private readonly pointerUpListener = (): void => {
        this.isResizing = false;
        this.isDragging = false;
        this.activeResizeDirection = undefined;
    };

    constructor() {
        this.layersReverse$ = this.projectService.getLayerStream().pipe(map((layers: Layer[]) => layers.slice(0).reverse()));
        this.mapIsGrid$ = this.mapService.isGrid$; // See 'MainComponent.mapIsGrid$' for the same implementation
    }

    ngOnInit(): void {
        this.mapService.registerMapComponent(this.mapComponent());
    }

    ngAfterViewInit(): void {
        const containerRect = this.hoverMapContainer().nativeElement.getBoundingClientRect();
        const containingBlockRect = this.getContainingBlock().getBoundingClientRect();
        this.hoverMapWidthPx = containerRect.width;
        this.hoverMapHeightPx = containerRect.height;
        this.hoverMapLeftPx = containerRect.left - containingBlockRect.left;
        this.hoverMapTopPx = containerRect.top - containingBlockRect.top;

        window.addEventListener('pointermove', this.pointerMoveListener);
        window.addEventListener('pointerup', this.pointerUpListener);

        this.mapComponent().resize();
    }

    ngOnDestroy(): void {
        window.removeEventListener('pointermove', this.pointerMoveListener);
        window.removeEventListener('pointerup', this.pointerUpListener);
    }

    onResizeStart(event: PointerEvent, direction: ResizeDirection): void {
        event.preventDefault();

        if (
            this.hoverMapWidthPx === undefined ||
            this.hoverMapHeightPx === undefined ||
            this.hoverMapLeftPx === undefined ||
            this.hoverMapTopPx === undefined
        ) {
            return;
        }

        this.isDragging = false;
        this.isResizing = true;
        this.activeResizeDirection = direction;
        this.startPointerX = event.clientX;
        this.startPointerY = event.clientY;
        this.startLeftPx = this.hoverMapLeftPx;
        this.startTopPx = this.hoverMapTopPx;
        this.startWidthPx = this.hoverMapWidthPx;
        this.startHeightPx = this.hoverMapHeightPx;
    }

    onDragStart(event: PointerEvent): void {
        event.preventDefault();

        if (this.hoverMapLeftPx === undefined || this.hoverMapTopPx === undefined) {
            return;
        }

        this.isResizing = false;
        this.isDragging = true;
        this.startPointerX = event.clientX;
        this.startPointerY = event.clientY;
        this.startLeftPx = this.hoverMapLeftPx;
        this.startTopPx = this.hoverMapTopPx;
    }

    onReloadButton() {
        // reloads the project from the backend
        // to retrieve new and old layers
        this.projectService
            .getProjectOnce()
            .pipe(first())
            .subscribe((proj) => {
                this.projectService.loadAndSetProject(proj.id).subscribe();
            });
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    private getContainingBlock(): HTMLElement {
        const container = this.hoverMapContainer().nativeElement;
        const offsetParent = container.offsetParent;
        if (offsetParent instanceof HTMLElement) {
            return offsetParent;
        }

        return document.documentElement;
    }
}
