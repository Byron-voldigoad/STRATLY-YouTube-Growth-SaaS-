import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';
import { importProvidersFrom } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideMarkdown(),
    importProvidersFrom(NgxChartsModule),
  ],
};
