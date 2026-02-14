import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {LayoutService} from '../../layout.service';
import {SidenavHeaderComponent} from '../../sidenav/sidenav-header/sidenav-header.component';
import {DialogHelpComponent} from '../../dialogs/dialog-help/dialog-help.component';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {AsyncPipe, NgIf} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {isPostMessageMessage, PostMessageMessage, UserService} from '@geoengine/common';
import {ProjectService} from '../../project/project.service';
import {first} from 'rxjs/operators';
import {combineLatest} from 'rxjs';

interface FormData {
    layerName: FormControl<string | null>;
}

@Component({
    selector: 'geoengine-create-workflow',
    templateUrl: './create-workflow.component.html',
    styleUrl: './create-workflow.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SidenavHeaderComponent,
        DialogHelpComponent,
        ReactiveFormsModule,
        MatFormField,
        MatInput,
        AsyncPipe,
        MatButton,
        MatHint,
        MatLabel,
        NgIf,
    ],
})
export class CreateWorkflowComponent {
    readonly form: FormGroup<FormData>;
    protected readonly dialog = inject(MatDialog);
    protected readonly layoutService = inject(LayoutService);
    protected readonly userService = inject(UserService);
    protected readonly projectService = inject(ProjectService);
    private workflowMessageHandler?: (event: MessageEvent) => void;

    constructor() {
        this.form = new FormGroup({
            layerName: new FormControl<string>('New Layer', Validators.required),
        });
    }

    openEditor(): void {
        this.layoutService.setSidenavContentComponent(undefined);
        const layerName = this.form.controls.layerName.value;
        if (layerName) {
            // TODO/workflow
            console.warn('The redirect is not properly implemented yet, ', window.origin);
            const normalizedName = encodeURIComponent(layerName);
            combineLatest([this.userService.getSessionTokenStream(), this.projectService.getProjectOnce()])
                .pipe(first())
                .subscribe(([token, project]) => {
                    console.warn('preparing to send token, ', token);
                    const myHostname = window.location.hostname;
                    // must be external
                    const workflowUrl = `http://${myHostname}:4201/workflow/${normalizedName}?token=${encodeURIComponent(
                        token,
                    )}&project=${encodeURIComponent(project.id)}`;
                    const workflowOrigin = new URL(workflowUrl).origin;
                    const workflowTab = open(workflowUrl, '_blank');

                    // can this be null?
                    if (!workflowTab) {
                        console.warn('just opened window is null!');
                    }

                    if (this.workflowMessageHandler) {
                        window.removeEventListener('message', this.workflowMessageHandler);
                    }

                    this.workflowMessageHandler = (event: MessageEvent) : void => {
                        console.warn('from create workflow component ', {event});
                        // failsafe as described by <https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage>
                        if (event.origin !== workflowOrigin) return;

                        if (!isPostMessageMessage(event.data)) /* don't know what this is => ignore */ return;

                        const data = event.data as PostMessageMessage;

                        if (data.kind === 'test') {
                            console.warn('test the connection: ', data.data);
                        }

                        if (data.kind === 'tokenReq') {
                            if (!workflowTab) {
                                console.warn('workflowtab is null inside eventlistener');
                            }
                            console.warn('sending token', token);
                            workflowTab?.postMessage(
                                {
                                    kind: 'tokenResponse',
                                    data: token,
                                } as PostMessageMessage,
                                workflowOrigin,
                            );
                        }
                        if (data.kind == 'projectReq') {
                            if (!workflowTab) {
                                console.warn('workflowtab is null inside eventlistener');
                            }

                            this.projectService.getProjectOnce().subscribe((proj) => {
                                console.warn(`sending project token: {token}`);
                                const tkn = proj.id;
                                workflowTab?.postMessage(
                                    {
                                        kind: 'projectResponse',
                                        data: tkn,
                                    } as PostMessageMessage,
                                    workflowOrigin,
                                );
                            });
                        }
                    };
                    window.addEventListener('message', this.workflowMessageHandler);
                });
        }
    }
}
