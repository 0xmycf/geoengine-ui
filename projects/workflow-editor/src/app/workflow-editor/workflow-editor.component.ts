import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, input, InputSignal, OnInit, viewChild} from '@angular/core';
import {Layer, NotificationService, UserService} from '@geoengine/common';
import {render, WidgetModel} from 'workflow-editor';
import {BehaviorSubject, mergeMap} from 'rxjs';
import {map} from 'rxjs/operators';
import {AsyncPipe} from '@angular/common';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {DatasetService, ProjectService, type WorkflowDict} from '@geoengine/core';
import type {TypedOperatorOperator, Workflow as OpenApiWorkflow} from '@geoengine/openapi-client';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';

type WidgetWorkflow = NonNullable<WidgetModel['workflow']>;
type WidgetWorkflowOperator = WidgetWorkflow['operator'];
type BackendWorkflow = WorkflowDict | OpenApiWorkflow;

class WidgetModelWrapper {
    data: WidgetModel = {} as unknown as WidgetModel;
    listeners: Record<string, ((msg: unknown, buffers: DataView[]) => void)[]> = {};
    // disable inspection as this is actually required / used implicitly
    // noinspection JSUnusedGlobalSymbols
    // eslint-disable-next-line @typescript-eslint/naming-convention
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

    // not used right now
    // noinspection JSUnusedGlobalSymbols
    off(_eventName?: string, _callback?: (...args: unknown[]) => void): void {
        throw new Error('Function not implemented.');
    }

    on(eventName: string, callback: (msg: unknown, buffers: DataView[]) => void): void {
        const selectedListeners = this.listeners[eventName];

        if (selectedListeners) {
            selectedListeners.push(callback);
        } else {
            this.listeners[eventName] = [callback];
        }
    }

    // this is required to exist
    // noinspection JSUnusedGlobalSymbols
    // eslint-disable-next-line @typescript-eslint/naming-convention
    save_changes(): void {
        /*noop*/
    }

    // this is required to exist / not used
    // noinspection JSUnusedGlobalSymbols
    send(_content: unknown, _callbacks?: unknown, _buffers?: ArrayBuffer[] | ArrayBufferView[]): void {
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
    imports: [AsyncPipe, MatProgressSpinner, MatToolbar, MatButtonModule],
})
export class WorkflowEditorComponent implements OnInit, AfterViewInit {
    layerName = 'New Workflow Layer';
    layer?: Layer;

    readonly widgetRef = viewChild.required<ElementRef<HTMLElement>>('widget');
    readonly loading$;
    readonly isValid$ = new BehaviorSubject(false);
    readonly widgetModel = new WidgetModelWrapper();
    readonly layerOrNewName: InputSignal<LayerOrNewName> = input({layerOrNewName: 'New Workflow Layer'} as LayerOrNewName);
    readonly projectService: ProjectService = inject(ProjectService);
    readonly workflowId = input<string | undefined>();

    private readonly userService: UserService = inject(UserService);
    private readonly notificationService: NotificationService = inject(NotificationService);
    private readonly datasetService: DatasetService = inject(DatasetService);

    constructor() {
        this.loading$ = new BehaviorSubject(false);
        this.userService.getSessionStream().subscribe((session) => {
            this.widgetModel.set('token', session.sessionToken);
            this.widgetModel.set('serverUrl', session.apiConfiguration.basePath);
        });
        this.widgetModel.on('change:workflow', () => {
            const workflow = this.widgetModel.get('workflow');
            this.isValid$.next(workflow != null);
        });
    }

    ngOnInit(): void {
        const layerOrNewName = this.layerOrNewName().layerOrNewName;

        if (typeof layerOrNewName === 'string') {
            this.layer = undefined;
            this.layerName = layerOrNewName;
            return;
        }

        this.layer = layerOrNewName;
        this.layerName = layerOrNewName.name;
    }

    ngAfterViewInit(): void {
        if (this.layer) {
            this.loading$.next(true);
            this.projectService.getWorkflow(this.layer.workflowId).subscribe((workflow) => {
                this.widgetModel.set('workflow', this.toWidgetWorkflow(workflow));
                render({
                    model: this.widgetModel,
                    el: this.widgetRef().nativeElement,
                });
                this.loading$.next(false);
            });
        } else if (this.workflowId()) {
            this.loading$.next(true);
            this.projectService.getWorkflow(this.workflowId()!).subscribe((workflow) => {
                this.widgetModel.set('workflow', this.toWidgetWorkflow(workflow));
                render({
                    model: this.widgetModel,
                    el: this.widgetRef().nativeElement,
                });
                this.loading$.next(false);
            });
        } else {
            render({
                model: this.widgetModel,
                el: this.widgetRef().nativeElement,
            });
        }
    }

    onSave(): void {
        const layerCopy = this.layer;

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
            this.projectService
                .registerWorkflow(this.widgetModel.get('workflow')!)
                .pipe(
                    mergeMap((workflowId) => {
                        return this.datasetService.createLayerFromWorkflow(this.layerName, workflowId);
                    }),
                    map((layer) => {
                        return this.projectService.addLayer(layer);
                    }),
                )
                .subscribe(() => {
                    this.notificationService.info(`Created layer »${this.layerName}«`);
            });
        }
    }

    private toWidgetWorkflow(workflow: BackendWorkflow): WidgetWorkflow {
        return {
            type: workflow.type,
            operator: this.toWidgetOperator(workflow.operator),
        };
    }

    private toWidgetOperator(operator: WorkflowDict['operator'] | TypedOperatorOperator): WidgetWorkflowOperator {
        const normalized = this.toWidgetOperatorFromUnknown(operator);

        if (normalized) {
            return normalized;
        }

        return {type: operator.type, params: {}};
    }

    private toWidgetOperatorFromUnknown(operator: unknown): WidgetWorkflowOperator | undefined {
        if (!this.isObjectRecord(operator)) {
            return undefined;
        }

        const type = operator['type'];

        if (typeof type !== 'string') {
            return undefined;
        }

        const result: WidgetWorkflowOperator = {
            type,
            params: this.toParamsRecord(operator['params']),
        };

        const sources = this.toWidgetSources(operator['sources']);

        if (sources) {
            result.sources = sources;
        }

        return result;
    }

    private toWidgetSources(sources: unknown): WidgetWorkflowOperator['sources'] {
        if (!this.isObjectRecord(sources)) {
            return undefined;
        }

        const mappedSources: Record<string, WidgetWorkflowOperator | WidgetWorkflowOperator[]> = {};

        for (const [sourceName, sourceOperator] of Object.entries(sources)) {
            if (Array.isArray(sourceOperator)) {
                const operators = sourceOperator
                    .map((op) => this.toWidgetOperatorFromUnknown(op))
                    .filter((op): op is WidgetWorkflowOperator => op !== undefined);

                if (operators.length > 0) {
                    mappedSources[sourceName] = operators;
                }
            } else {
                const operator = this.toWidgetOperatorFromUnknown(sourceOperator);

                if (operator) {
                    mappedSources[sourceName] = operator;
                }
            }
        }

        return Object.keys(mappedSources).length > 0 ? mappedSources : undefined;
    }

    private toParamsRecord(value: unknown): Record<string, unknown> {
        if (this.isObjectRecord(value)) {
            return value;
        }

        return {};
    }

    private isObjectRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
