import {Component, inject, OnInit} from '@angular/core';
import {UserService, isPostMessageMessage, PostMessageMessage} from '@geoengine/common';
import {RouterOutlet} from '@angular/router';
import {gisOrigin, postMessageToGis} from './util';

@Component({
    selector: 'workflow-editor-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
    readonly userService: UserService = inject(UserService);

    ngOnInit(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            if (event.origin !== gisOrigin()) return;

            if (!isPostMessageMessage(event.data)) /* invalid data format */ return;

            const msg = event.data as PostMessageMessage;
            if (msg.kind === 'tokenResponse' && msg.data) {
                console.warn("got token; ", msg.data);

                this.createSession(msg.data);
            }

        });
        this.requestSessionToken();
    }

    private requestSessionToken(): void {
        postMessageToGis({kind: 'tokenReq', data: null});
    }

    private async createSession(token: string) {
        if (token) {
            this.userService.createSessionWithToken(token).subscribe();
            this.userService.saveSettingInLocalStorage('session', token);
        }
    }
}
