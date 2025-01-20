/**
 * Service for managing Access Requests and Access Grants.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UrlHelper } from "../helper/url-helper";
import { SessionInformation } from "../interface/session-information";
import { SessionService } from "./session.service";
import { PodService } from "./pod.service";
import {AccessGrant, AccessRequest} from "@inrupt/solid-client-access-grants";


@Injectable({
  providedIn: 'root'
})
export class VcService {

  /**
   * The currently logged-in user's session information.
   */
  sessionInformation: SessionInformation | undefined;

  /**
   * Constructor for the VcService.
   * @param http - The HttpClient service for making HTTP requests.
   * @param sessionService - Reference to the SessionService to manage user sessions.
   * @param podService - Reference to the PodService to retrieve POD URLs.
   * @param urlHelper - The UrlHelper to construct URLs for connection with the We Are Demo Backend.
   */
  constructor(private http: HttpClient, private sessionService: SessionService, private podService: PodService, private urlHelper: UrlHelper) {
    this.sessionService.sessionInformation$.subscribe(sessionInformation => {
      this.sessionInformation = sessionInformation;
    });
  }

  /**
   * Creates a Solid access request for a location in the user's pod, allowing read, write, and append permissions with a specific purpose
   * https://utils.we-are-health.be/data/vocab/sharing/container-sharing-purpose#_ContainerSharingPurpose
   * @returns A Promise that resolves with the generated AccessRequest object.
   * @throws Error if the user is not logged in.
   */
  async issuePodAccessRequest(): Promise<AccessRequest> {
    if (!this.sessionInformation?.isLoggedIn) {
      throw Error('Login required')
    }

    const data = [this.podService.getRootPodUrl()!.href];

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 1);

    const access = {
      read: true,
      write: true,
      append: true
    }

    const accessRequest = (await firstValueFrom(this.http.post(this.urlHelper.getAccessRequestEndpoint()!.href, {
      data: data,
      webId: this.sessionInformation?.webId,
      purpose: 'https://utils.we-are-health.be/data/vocab/sharing/container-sharing-purpose#_ContainerSharingPurpose',
      expirationDate: expirationDate,
      access: access
    }, {
      withCredentials: true,
      responseType: 'json'
    })));

    return accessRequest as AccessRequest;
  }

  /**
   * Sets an access grant on the We Are Demo Backend.
   * @param accessGrantId - The ID of the access grant to be set.
   * @returns A Promise that resolves when the access grant is successfully set.
   */
  async setPodAccessGrant(accessGrantId: string): Promise<void> {
    await firstValueFrom(this.http.post(this.urlHelper.getAccessGrantEndpoint()!.href, {
      accessGrantId: accessGrantId
    }, {
      withCredentials: true,
      responseType: 'text'
    }));
  }

  async getAccessGrants(): Promise<AccessGrant[]> {
    const accessGrants = await firstValueFrom(this.http.get(this.urlHelper.getAccessGrantEndpoint().href, {
      withCredentials: true,
      responseType: 'json'
    }));

    return accessGrants as AccessGrant[];
  }
}
