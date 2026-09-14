import { InjectionToken } from '@angular/core';

export const FRONTEND_URL = new InjectionToken<URL>('frontendUrl');
export const BACKEND_URL = new InjectionToken<URL>('backendUrl');
