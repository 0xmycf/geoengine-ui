import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, input, InputSignal, ViewChild} from '@angular/core';
import {FxLayoutAlignDirective, FxLayoutDirective, Layer, NotificationService, UserService} from '@geoengine/common';
import {render, WidgetModel} from 'workflow-editor';
import {BehaviorSubject, mergeMap} from 'rxjs';
import {map} from 'rxjs/operators';
import {AsyncPipe, NgIf} from '@angular/common';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {DatasetService, ProjectService} from '@geoengine/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';

class WidgetModelWrapper {
    data: WidgetModel = {} as any;
    listeners: Record<string, ((msg: any, buffers: DataView[]) => void)[]> = {};
    widget_manager: undefined;

    get<K extends keyof WidgetModel>(key: K): WidgetModel[K] {
        return this.data[key];
    }

    set<K extends keyof WidgetModel>(key: K, value: WidgetModel[K]): void {
        const oldValue = this.data[key];

        if (oldValue !== value) {
            this.data[key] = value;
            this.listeners['change:' + key]?.forEach((listener) => listener.call(this, null, []));
        }
    }

    off(_eventName?: string, _callback?: (...args: any[]) => void): void {
        throw new Error('Function not implemented.');
    }

    on(eventName: string, callback: (msg: any, buffers: DataView[]) => void): void {
        let selectedListeners = this.listeners[eventName];

        if (selectedListeners) {
            selectedListeners.push(callback);
        } else {
            this.listeners[eventName] = [callback];
        }
    }

    save_changes(): void {
        //noop
    }

    send(_content: any, _callbacks?: any, _buffers?: ArrayBuffer[] | ArrayBufferView[] | undefined): void {
        throw new Error('Function not implemented.');
    }
}

export interface LayerOrNewName {
    layerOrNewName: Layer | string;
}

@Component({
    selector: 'geoengine-workflow-editor',
    standalone: true,
    templateUrl: './workflow-editor.component.html',
    styleUrls: ['./workflow-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, MatProgressSpinner, FxLayoutAlignDirective, FxLayoutDirective, NgIf, MatToolbar, MatButtonModule],
})
export class WorkflowEditorComponent implements AfterViewInit {
    readonly layerName: string;
    readonly layer?: Layer;

    @ViewChild('widget')
    readonly widgetRef!: ElementRef;
    readonly loading$;
    readonly isValid$ = new BehaviorSubject(false);
    readonly widgetModel = new WidgetModelWrapper();
    readonly layerOrNewName: InputSignal<LayerOrNewName> = input({layerOrNewName: 'New Workflow Layer'} as LayerOrNewName);
    readonly projectService: ProjectService = inject(ProjectService);
    readonly workflowId = input<string | undefined>();

    constructor(
        private userService: UserService,
        private notificationService: NotificationService,
        private datasetService: DatasetService,
    ) {
        if (typeof this.layerOrNewName().layerOrNewName === 'string') {
            this.layerName = this.layerOrNewName().layerOrNewName as string;
            this.loading$ = new BehaviorSubject(false);
        } else {
            this.layer = this.layerOrNewName().layerOrNewName as Layer;
            this.layerName = this.layer.name;
            this.loading$ = new BehaviorSubject(true);
        }
        this.userService.getSessionStream().subscribe((session) => {
            this.widgetModel.set('token', session.sessionToken);
            this.widgetModel.set('serverUrl', session.apiConfiguration.basePath);
        });
        this.widgetModel.on('change:workflow', () => {
            const workflow = this.widgetModel.get('workflow');
            this.isValid$.next(workflow != null);
        });
    }

    ngAfterViewInit(): void {
        if (this.layer) {
            this.projectService.getWorkflow(this.layer.workflowId).subscribe((workflow) => {
                this.widgetModel.set('workflow', workflow as any);
                render({
                    model: this.widgetModel,
                    el: this.widgetRef.nativeElement,
                });
                this.loading$.next(false);
            });
        } else if (this.workflowId()) {
            this.projectService.getWorkflow(this.workflowId()!).subscribe((workflow) => {
                this.widgetModel.set('workflow', workflow as any);
                render({
                    model: this.widgetModel,
                    el: this.widgetRef.nativeElement,
                });
                this.loading$.next(false);
            });
        } else {
            render({
                model: this.widgetModel,
                el: this.widgetRef.nativeElement,
            });
        }
    }

    onSave(): void {
        console.warn('onSave');
        const layerCopy = this.layer;
        console.warn({layerCopy});

        if (layerCopy) {
            this.projectService
                .registerWorkflow(this.widgetModel.get('workflow')!)
                .pipe(
                    map((workflowId) =>
                        this.projectService.changeLayer(layerCopy, {
                            workflowId,
                        }),
                    ),
                )
                .subscribe(() => {
                    this.notificationService.info(`Updated layer »${this.layerName}«`);
                });
        } else if (this.workflowId()) {
            this.projectService
                .getProjectOnce()
                .pipe(
                    map((project) => project.layers.find((l) => l.workflowId === this.workflowId())),
                    mergeMap((layer) => {
                        if (!layer) {
                            return this.projectService.registerWorkflow(this.widgetModel.get('workflow')!).pipe(
                                mergeMap((workflowId) => this.datasetService.createLayerFromWorkflow(this.layerName, workflowId)),
                                map((newLayer) => this.projectService.addLayer(newLayer)),
                            );
                        }

                        return this.projectService.registerWorkflow(this.widgetModel.get('workflow')!).pipe(
                            map((workflowId) =>
                                this.projectService.changeLayer(layer, {
                                    workflowId,
                                }),
                            ),
                        );
                    }),
                )
                .subscribe(() => {
                    this.notificationService.info(`Updated layer »${this.layerName}«`);
                });
        } else {
            const wf = this.widgetModel.get('workflow');
            console.warn({wf});
            this.projectService
                .registerWorkflow(this.widgetModel.get('workflow')!)
                .pipe(
                    mergeMap((workflowId) => {
                        console.warn('workflowId is ' + workflowId);
                        return this.datasetService.createLayerFromWorkflow(this.layerName, workflowId);
                    }),
                    map((layer) => {
                        console.warn('layer is ', +layer);
                        console.warn({layer});
                        return this.projectService.addLayer(layer);
                    }),
                )
                .subscribe(() => {
                    this.notificationService.info(`Created layer »${this.layerName}«`);
                });
        }
    }
}
