import { Component } from '@angular/core';
import {environment} from "../environments/environment";
import {UrlHelper} from "./helper/url-helper";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent {
  constructor() {}
}
