import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {UUID} from '../../backend/backend.model';
import {ProjectService} from '../../project/project.service';
import {isValidUuid, NotificationService} from '@geoengine/common';
import {SidenavHeaderComponent} from '../../sidenav/sidenav-header/sidenav-header.component';
import {DialogHelpComponent} from '../../dialogs/dialog-help/dialog-help.component';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {AsyncPipe} from '@angular/common';
import {DatasetService} from '../dataset.service';

@Component({
    selector: 'geoengine-add-workflow',
    templateUrl: './add-workflow.component.html',
    styleUrls: ['./add-workflow.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SidenavHeaderComponent,
        DialogHelpComponent,
        FormsModule,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatHint,
        MatButton,
        AsyncPipe,
    ],
})
export class AddWorkflowComponent {
    protected readonly projectService = inject(ProjectService);
    protected readonly notificationService = inject(NotificationService);
    protected readonly datasetService = inject(DatasetService);

    readonly form: UntypedFormGroup;

    constructor() {
        this.form = new UntypedFormGroup({
            layerName: new UntypedFormControl('New Layer', Validators.required),
            workflowId: new UntypedFormControl('', [Validators.required, isValidUuid]),
        });
    }

    add(): void {
        const layerName: string = this.form.controls.layerName.value;
        const workflowId: UUID = this.form.controls.workflowId.value;

        this.datasetService.createLayerFromWorkflow(layerName, workflowId).subscribe(
            (layer) => {
                this.projectService.addLayer(layer);
            },
            (error) => {
                let errorMessage = `No workflow found for id: ${workflowId}`;

                if ('error' in error) {
                    if (error.error !== 'NoWorkflowForGivenId') {
                        errorMessage = `Unknown error -> ${error.error}: ${error.message}`;
                    }
                } else {
                    errorMessage = error.message;
                }
                this.notificationService.error(errorMessage);
            },
        );
    }
}
