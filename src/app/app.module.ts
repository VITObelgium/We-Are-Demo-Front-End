import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MainComponent } from './main/main.component';
import {BACKEND_URL, FRONTEND_URL} from "./tokens";
import {environment} from "../environments/environment";

@NgModule({ declarations: [
        AppComponent,
        MainComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule,
        AppRoutingModule], providers: [
        { provide: FRONTEND_URL, useValue: new URL(environment.frontendUrl) },
        { provide: BACKEND_URL, useValue: new URL(environment.backendUrl) },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }
