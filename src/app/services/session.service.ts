/**
 * Service for managing the user's session.
 */
import {Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, firstValueFrom} from "rxjs";
import {SessionInformation} from "../interface/session-information";
import {UrlHelper} from "../helper/url-helper";
import {AccessGrant} from "@inrupt/solid-client-access-grants";

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  /**
   * Subject emitting the current session information.
   */
  sessionInformation$ = new BehaviorSubject<SessionInformation | undefined>(undefined);

  /**
   * Constructor for the SessionService.
   * @param http - The HttpClient service for making HTTP requests.
   * @param urlHelper - The UrlHelper to construct URLs for communication to the We Are Demo Backend.
   */
  constructor(private http: HttpClient, private urlHelper: UrlHelper) {
    this.getSessionInformation();
  }

  login(): void {
    window.location.href = this.urlHelper.getLoginEndpoint().href;
  }

  switchIdentity() {
    window.location.href = this.urlHelper.getLoginEndpoint(true).href;
  }

  logout(): void {
    window.location.href = this.urlHelper.getLogoutEndpoint().href;
  }

  /**
   * Asynchronously retrieves the current session information from the server.
   * @returns A Promise that resolves with the retrieved SessionInformation object.
   */
  async getSessionInformation(): Promise<SessionInformation> {
    const sessionInformation = await firstValueFrom(this.http.get(this.urlHelper.getSessionInformationEndpoint().href, {
      withCredentials: true,
      responseType: 'json'
    })) as SessionInformation;

    this.sessionInformation$.next(sessionInformation);

    return sessionInformation;
  }

  /**
   * Sets an access grant for a Solid pod on the sessionInformation. This allows controlled access to the user's data.
   * @param accessGrant - The AccessGrant object containing the access permissions.
   */
  async setPodAccessGrant(accessGrant: AccessGrant): Promise<void> {
    await firstValueFrom(this.http.put(this.urlHelper.getPodAccessGrantEndpoint().href, accessGrant));

    this.getSessionInformation();
  }
}
