import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {WorkflowEditorComponent} from '../../workflow-editor/workflow-editor.component';
import {LayoutService} from '../../layout.service';
import {SidenavHeaderComponent} from '../../sidenav/sidenav-header/sidenav-header.component';
import {DialogHelpComponent} from '../../dialogs/dialog-help/dialog-help.component';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {AsyncPipe, NgIf} from '@angular/common';
import {MatButton} from '@angular/material/button';

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

    constructor() {
        this.form = new FormGroup({
            layerName: new FormControl<string>('New Layer', Validators.required),
        });
    }

    openEditor(): void {
        this.layoutService.setSidenavContentComponent(undefined);
        const layerName = this.form.controls.layerName.value;
        if (layerName) {
            this.dialog.open(WorkflowEditorComponent, {data: {layerOrNewName: layerName}});
        }
        // TODO what if its null (can it be null?) Fix the types here!
    }
}
