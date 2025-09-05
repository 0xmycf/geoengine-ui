import {bootstrapApplication, BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideRouter} from '@angular/router';
import {CommonConfig, NotificationService, RandomColorService} from '@geoengine/common';
import {importProvidersFrom, inject, provideAppInitializer} from '@angular/core';
import {routes} from './app/app.routes';
import {CoreConfig, CoreModule, MapService, ProjectService} from '@geoengine/core';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, CoreModule),
        provideRouter(routes),

        {provide: CoreConfig, useClass: CoreConfig},
        {provide: CommonConfig, useExisting: CoreConfig},

        provideAppInitializer(() => {
            const initializerFn = (
                (config: CommonConfig) => (): Promise<void> =>
                    config.load()
            )(inject(CommonConfig));
            return initializerFn();
        }),
        ProjectService,
        NotificationService,
        MapService,
        RandomColorService,
    ],
}).catch((err) => console.error(err));
