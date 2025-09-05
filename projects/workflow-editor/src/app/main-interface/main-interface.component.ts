import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {WorkflowEditorComponent} from '../workflow-editor/workflow-editor.component';
import {MapContainerComponent} from '@geoengine/core';
import {HoverMapComponent} from '../hover-map/hover-map.component';
import {UserService} from '@geoengine/common';

@Component({
    selector: 'app-main-interface',
    imports: [WorkflowEditorComponent, MapContainerComponent, MapContainerComponent, HoverMapComponent],
    templateUrl: './main-interface.component.html',
    styleUrl: './main-interface.component.scss',
})
export class MainInterfaceComponent implements OnInit {
    route: ActivatedRoute = inject(ActivatedRoute);
    userService: UserService = inject(UserService);
    name?: string;

    ngOnInit(): void {
        const token = this.getToken();
        if (token) {
            this.userService.createSessionWithToken(token).subscribe();
            this.userService.saveSettingInLocalStorage('session', token);
        }
    }

    private getToken() {
        return this.route.snapshot.queryParamMap.get('token');
    }

    getName(): string {
        const name = this.route.snapshot.params['name'];
        this.name = name;
        return name;
    }
}
