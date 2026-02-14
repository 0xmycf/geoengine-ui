import {Routes} from '@angular/router';
import {BackendAvailableGuard, CanRegisterGuard, LoginComponent, RegisterComponent} from '@geoengine/common';
import {MainInterfaceComponent} from './main-interface/main-interface.component';

/* adapted from 'projects/manager/src/app/app-routing.module.ts' */
export const routes: Routes = [
    {path: '', redirectTo: 'workflow/newLayer', pathMatch: 'full'},
    {path: 'workflow/:name', component: MainInterfaceComponent, canActivate: []},
    {path: 'signin', component: LoginComponent, data: {loginRedirect: '/workflow'}},
    {
        path: 'register',
        component: RegisterComponent,
        data: {loginRedirect: '/workflow'},
        canActivate: [BackendAvailableGuard, CanRegisterGuard],
    },
];
