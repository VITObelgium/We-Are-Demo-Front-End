/**
 * Main component of the application, providing user interactions and managing sessions.
 */

import { Component, OnInit } from '@angular/core';
import { PodService } from 'src/app/services/pod.service';
import { ActivatedRoute } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import {
  addStringNoLocale,
  addUrl,
  createSolidDataset,
  createThing,
  setThing,
  solidDatasetAsTurtle
} from "@inrupt/solid-client";
import { SessionService } from "../services/session.service";
import { SessionInformation } from "../interface/session-information";
import { UrlHelper } from "../helper/url-helper";
import { VcService } from "../services/vc.service";
import {AccessGrant} from "@inrupt/solid-client-access-grants";

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css'],
    standalone: false
})
export class MainComponent implements OnInit {

  /** Session information about the current user */
  sessionInformation?: SessionInformation;

  /** Turtle representation of a dataset written to the Pod */
  writtenTurtle?: string;

  /** Turtle representation of a dataset read from the Pod */
  readTurtle?: string;

  accessGrants?: AccessGrant[];

  constructor(private sessionService: SessionService, private podService: PodService, private vcService: VcService, private urlHelper: UrlHelper, private route: ActivatedRoute) { }

  /**
   * load the sessionInformation and if the user is directed back to this page with an access-grant-id,
   * we set the access grant on the sessionInformation on the backend.
   *
   * The call to get the sessionInformation done prior to setting the access grant is necessary because in the Inrupt SDK refresh tokens are used on each call to get a new access token.
   * When 2 calls are done almost simultaniously, the refresh token of the second call is not valid anymore, which will result in an error.
   */
  async ngOnInit(): Promise<void> {
    this.sessionService.sessionInformation$.subscribe((sessionInformation) => {
      this.sessionInformation = sessionInformation;
    });

    this.route.queryParams.subscribe(async params => {
      if (params['access-grant-id']) {
        await firstValueFrom(this.sessionService.sessionInformation$.pipe(filter(sessionInformation => sessionInformation !== undefined))); // Wait for the session information to be loaded
        await this.setPodAccessGrant(params['access-grant-id']);
      }
    });
  }

  /**
 * Initiates the user login process.
 */
  login() {
    this.sessionService.login();
  }

  /**
   * Trigger the switchIdentity flow which is a temporary workaround that needs to be done when the user has it's pod and webId removed in another We Are client application.
   */
  switchIdentity() {
    this.sessionService.switchIdentity();
  }

  /**
   * Logs the current user out, clearing session data.
   */
  logout() {
    this.sessionService.logout();
  }

  /**
   * Creates a Solid dataset with sample RDF data and writes it to the Pod.
   */
  async writeDataset() {
    let dataset = createSolidDataset();
    let book = createThing({ name: "example_poetry" });
    book = addStringNoLocale(book, "http://schema.org/name", "ZYX987 of Example Poetry");
    book = addUrl(book, "https://www.w3.org/1999/02/22-rdf-syntax-ns#type", "https://schema.org/Book");
    dataset = setThing(dataset, book);

    await this.podService.writeSolidDatasetRelative('book_index', dataset);
    this.writtenTurtle = await solidDatasetAsTurtle(dataset);
  }

  /**
   * Reads a Solid dataset from the Pod and displays it in Turtle format.
   */
  async readDataset() {
    const solidDataset = await this.podService.getSolidDatasetRelative('book_index');
    this.readTurtle = await solidDatasetAsTurtle(solidDataset);
  }

  /**
   * Initiates a Pod Access Request (PAR) using the VC service.
   */
  async issuePodAccessRequest() {
    this.vcService.issuePodAccessRequest().then((accessRequest) => {
      window.location.href = this.urlHelper.getAccessRequestConsentEndpoint(accessRequest).href;
    }).catch((error) => {
      console.error(error);
      this.sessionService.getSessionInformation();
    });
  }

  /**
   * Sets a Pod Access Grant received from the user, updating the session information.
   */
  async setPodAccessGrant(accessGrantId: string) {
    return this.vcService.setPodAccessGrant(accessGrantId!).then(async () => {
      await this.sessionService.getSessionInformation();
    });
  }

  /**
   * Delete pod and webId for the user.
   */
  deletePod() {

  }

  async retrieveAccessGrants() {
    this.accessGrants = await this.vcService.getAccessGrants();
  }

  protected readonly JSON = JSON;
}
