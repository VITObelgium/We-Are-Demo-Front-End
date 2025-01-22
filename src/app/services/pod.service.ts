/**
 * Service for interacting with Solid pods.
 */
import { Injectable } from '@angular/core';
import {firstValueFrom} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SolidDataset, solidDatasetAsTurtle } from "@inrupt/solid-client";
import { turtleAsSolidDataset } from "@vito-nv/weare-core";
import {UrlHelper} from "../helper/url-helper";
import {SessionInformation} from "../interface/session-information";
import {SessionService} from "./session.service";


@Injectable({
  providedIn: 'root'
})
export class PodService {
  sessionInformation: SessionInformation | undefined;

  /**
   * Constructor for the PodService.
   * @param http - The HttpClient service for making HTTP requests.
   * @param sessionService - The SessionService to retrieve the current user session information.
   * @param urlHelper - The UrlHelper to construct URLs to interact with the We Are Demo Backend.
   */
  constructor(private http: HttpClient, private sessionService: SessionService, private urlHelper: UrlHelper) {
    this.sessionService.sessionInformation$.subscribe(sessionInformation => {
      this.sessionInformation = sessionInformation;
    });
  }

  /**
   * Retrieves the URL of the user's root pod.
   * @returns A URL object representing the user's root pod.
   */
  getRootPodUrl(): URL {
    if(!this.sessionInformation?.pods) {
      throw Error('No session or pod available')
    }

    return new URL(this.sessionInformation!.pods![0]);
  }

  /**
   * Constructs the full URL for a resource within the user's application container pod.
   * @param relativeResourcePath - The path to the resource relative to the app container pod.
   * @returns A URL object representing the full resource URL.
   */
  getResourceUrl(relativeResourcePath: string) {
    const resourceUrl = this.getRootPodUrl();
    if (!resourceUrl.pathname.endsWith('/')) {
      resourceUrl.pathname += '/';
    }
    resourceUrl.pathname += `${relativeResourcePath}`;

    return resourceUrl;
  }

  /**
   * Asynchronously retrieve a Solid dataset from the given relative path within the user's pod.
   * @param relativePath - The relative path to the Solid dataset within the pod.
   * @returns A Promise that resolves with the retrieved SolidDataset object.
   */
  async getSolidDatasetRelative(relativePath: string): Promise<SolidDataset> {
    return this.getSolidDataset(this.getResourceUrl(relativePath));
  }

  /**
   * Asynchronously retrieves a Solid dataset from the given URL.
   * @param resourceUrl - The URL of the Solid dataset to retrieve.
   * @returns A Promise that resolves with the retrieved SolidDataset object.
   */
  async getSolidDataset(resourceUrl: URL): Promise<SolidDataset> {
    const turtle = await firstValueFrom(this.http.get(this.urlHelper.getReadEndpoint(resourceUrl).href, {
      withCredentials: true,
      responseType: 'text'
    }));

    return turtleAsSolidDataset(turtle);
  }


  /**
   * Asynchronously writes a Solid dataset to the given relative path within the user's pod.
   * @param relativePath - The relative path to write the Solid dataset to within the pod.
   * @param dataset - The SolidDataset object to write.
   * @returns A Promise that resolves with a string representation of the written data.
   */
  async writeSolidDatasetRelative(relativePath: string, dataset: SolidDataset): Promise<string> {
    return this.writeSolidDataset(this.getResourceUrl(relativePath), dataset);
  }

  /**
   * Asynchronously writes a Solid dataset to the given URL.
   * @param resourceUrl - The URL to write the Solid dataset to.
   * @param dataset - The SolidDataset object to write.
   * @returns A Promise that resolves with a string representation of the written data.
   */
  async writeSolidDataset(resourceUrl: URL, dataset: SolidDataset):  Promise<string> {
    const turtle = await solidDatasetAsTurtle(dataset);
    return firstValueFrom(this.http.post(this.urlHelper.getWriteEndpoint(resourceUrl).href, turtle, {
      withCredentials: true,
      responseType: 'text',
    }));
  }
}
