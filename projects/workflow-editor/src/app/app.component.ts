import {Component, inject, OnInit} from '@angular/core';
import {UserService, isPostMessageMessage, PostMessageMessage} from '@geoengine/common';
import {RouterOutlet} from '@angular/router';
import {gisOrigin, postMessageToGis} from './util';
import {ProjectService} from '@geoengine/core';
import {first} from 'rxjs/operators';

@Component({
    selector: 'workflow-editor-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
    readonly userService: UserService = inject(UserService);
    readonly projectService: ProjectService = inject(ProjectService);

    ngOnInit(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            console.warn("from app.component.ts (editor)", {event})
            if (event.origin !== gisOrigin()) return;

            if (!isPostMessageMessage(event.data)) /* invalid data format */ return;

            const msg = event.data as PostMessageMessage;
            if (msg.kind === 'tokenResponse' && msg.data) {
                console.warn("got token; ", msg.data);

                this.createSession(msg.data);
            }
            if (msg.kind === "projectResponse" && msg.data) {
                console.warn("got projectResponse, msg.data");

                this.projectService.loadAndSetProject(msg.data).subscribe((proj) => {
                    console.warn("load and set proj to: ", {proj});
                });
            }

        });
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const projectId = params.get('project');
        if (token) {
            this.bootstrapFromUrl(token, projectId);
        } else {
            this.requestSessionToken();
        }
    }

    private requestSessionToken(): void {
        postMessageToGis({kind: 'tokenReq', data: null});
    }

    private requestPorjectToken(): void {
        postMessageToGis({kind: 'projectReq', data: null});
    }

    private async createSession(token: string) {
        if (token) {
            this.userService.createSessionWithToken(token).pipe(first()).subscribe(() => {
                this.requestPorjectToken();
                this.userService.saveSettingInLocalStorage('session', token);
            });
        }
    }

    private bootstrapFromUrl(token: string, projectId: string | null): void {
        this.userService.createSessionWithToken(token).pipe(first()).subscribe(() => {
            this.userService.saveSettingInLocalStorage('session', token);
            if (projectId) {
                this.projectService.loadAndSetProject(projectId).subscribe();
            }
        });
    }
}
