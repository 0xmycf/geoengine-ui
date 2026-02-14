import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {LayerOrNewName, WorkflowEditorComponent} from '../workflow-editor/workflow-editor.component';
import {HoverMapComponent} from '../hover-map/hover-map.component';
import {UserService} from '@geoengine/common';
import {ProjectService} from '@geoengine/core';

@Component({
    selector: 'geoengine-workflow-editor-main',
    imports: [WorkflowEditorComponent, HoverMapComponent],
    templateUrl: './main-interface.component.html',
    styleUrl: './main-interface.component.scss',
})
export class MainInterfaceComponent implements OnInit {
    route: ActivatedRoute = inject(ActivatedRoute);
    userService: UserService = inject(UserService);
    projectService: ProjectService = inject(ProjectService);
    name?: string;
    layerOrNewName: LayerOrNewName = {layerOrNewName: 'New Workflow Layer'};
    workflowId?: string;
    ready = false;

    ngOnInit(): void {
        const name = this.getName();
        this.workflowId = this.route.snapshot.queryParamMap.get('workflowId') ?? undefined;
        this.layerOrNewName = {layerOrNewName: name};
        this.ready = true;

        const token = this.getToken();
        if (token) {
            this.userService.createSessionWithToken(token).subscribe();
            this.userService.saveSettingInLocalStorage('session', token);
        }
    }

    private getToken(): string | null {
        return this.route.snapshot.queryParamMap.get('token');
    }

    getName(): string {
        const name = this.route.snapshot.paramMap.get('name');
        const def = 'New Workflow Layer';
        this.name = name ?? def;
        return name ?? def;
    }
}
