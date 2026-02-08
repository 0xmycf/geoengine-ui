import {AfterViewInit, Component, inject, OnInit, Signal, viewChild} from '@angular/core';
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
export class HoverMapComponent implements OnInit, AfterViewInit {
    readonly userService = inject(UserService);
    readonly projectService: ProjectService = inject(ProjectService);
    readonly mapService: MapService = inject(MapService);
    readonly backend: BackendService = inject(BackendService);
    readonly layersReverse$: Observable<Array<Layer>>;
    readonly mapIsGrid$: Observable<boolean>;
    readonly mapComponent: Signal<MapContainerComponent> = viewChild.required(MapContainerComponent);

    constructor() {
        this.layersReverse$ = this.projectService.getLayerStream().pipe(map((layers: Layer[]) => layers.slice(0).reverse()));
        this.mapIsGrid$ = this.mapService.isGrid$; // See 'MainComponent.mapIsGrid$' for the same implementation
    }

    ngOnInit(): void {
        this.mapService.registerMapComponent(this.mapComponent());
    }

    ngAfterViewInit(): void {
        this.mapComponent().resize();
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
}
