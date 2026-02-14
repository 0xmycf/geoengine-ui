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

    private readonly minWidthPx = 240;
    private readonly minHeightPx = 180;
    private readonly marginPx = 16;

    private isResizing = false;
    private startPointerX = 0;
    private startPointerY = 0;
    private startWidthPx = 0;
    private startHeightPx = 0;

    private readonly pointerMoveListener = (event: PointerEvent): void => {
        if (!this.isResizing) {
            return;
        }

        const pointerDeltaX = event.clientX - this.startPointerX;
        const pointerDeltaY = event.clientY - this.startPointerY;

        const containingBlock = this.getContainingBlock();
        const maxWidthPx = Math.max(this.minWidthPx, containingBlock.clientWidth - 2 * this.marginPx);
        const maxHeightPx = Math.max(this.minHeightPx, containingBlock.clientHeight - 2 * this.marginPx);

        this.hoverMapWidthPx = this.clamp(this.startWidthPx - pointerDeltaX, this.minWidthPx, maxWidthPx);
        this.hoverMapHeightPx = this.clamp(this.startHeightPx - pointerDeltaY, this.minHeightPx, maxHeightPx);

        this.mapComponent().resize();
    };

    private readonly pointerUpListener = (): void => {
        this.isResizing = false;
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
        this.hoverMapWidthPx = containerRect.width;
        this.hoverMapHeightPx = containerRect.height;

        window.addEventListener('pointermove', this.pointerMoveListener);
        window.addEventListener('pointerup', this.pointerUpListener);

        this.mapComponent().resize();
    }

    ngOnDestroy(): void {
        window.removeEventListener('pointermove', this.pointerMoveListener);
        window.removeEventListener('pointerup', this.pointerUpListener);
    }

    onResizeStart(event: PointerEvent): void {
        event.preventDefault();

        if (this.hoverMapWidthPx === undefined || this.hoverMapHeightPx === undefined) {
            return;
        }

        this.isResizing = true;
        this.startPointerX = event.clientX;
        this.startPointerY = event.clientY;
        this.startWidthPx = this.hoverMapWidthPx;
        this.startHeightPx = this.hoverMapHeightPx;
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
