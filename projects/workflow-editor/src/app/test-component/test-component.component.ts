import {Component, inject, OnInit} from '@angular/core';
import {PostMessageMessage, UserService} from '@geoengine/common';
import {BackendService} from '@geoengine/core';
import {gisOrigin} from '../util';

@Component({
    selector: 'app-test-component',
    standalone: true,
    imports: [],
    templateUrl: './test-component.component.html',
    styleUrl: './test-component.component.scss',
})
export class TestComponentComponent implements OnInit {
    userService: UserService = inject(UserService);
    backendService: BackendService = inject(BackendService);

    clickButton() {
        console.debug('clickButton');
        if (!window.opener) {
            console.warn('tab was not created through the interface');
        } else {
            console.warn('window opener is defined');
        }
        // TODO (high): fix the URL?
        opener.postMessage({kind: 'test', data: 'lorem ipsum by me'} as PostMessageMessage, gisOrigin());
    }

    ngOnInit() {
        console.log(this.base());
    }

    base(): string {
        return `one=${this.backendService.wmsBaseUrl}, other=${this.backendService.wcsBaseUrl}`;
    }
}
