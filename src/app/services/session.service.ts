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

  saveTokens() {
    window.location.href = this.urlHelper.getSaveTokensEndpoint().href;
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

  /**
   * Stores custom client credentials on the back-end session.
   * Subsequent back-end calls will use these credentials instead of the default ones.
   * @param clientId - The client ID to use for this session.
   * @param clientSecret - The client secret to use for this session.
   */
  async setClientCredentials(clientId: string, clientSecret: string): Promise<void> {
    await firstValueFrom(this.http.put(this.urlHelper.getClientCredentialsEndpoint().href, {
      clientId,
      clientSecret
    }, {
      withCredentials: true,
      responseType: 'json'
    }));

    await this.getSessionInformation();
  }

  /**
   * Removes the custom client credentials from the back-end session,
   * reverting to the default credentials configured on the back-end.
   */
  async clearClientCredentials(): Promise<void> {
    await firstValueFrom(this.http.delete(this.urlHelper.getClientCredentialsEndpoint().href, {
      withCredentials: true,
      responseType: 'json'
    }));

    await this.getSessionInformation();
  }

  /**
   * Retrieves the We Are PIMS HTI launch URL from the back-end.
   * @param debug - When `true`, the PIMS launch page shows the token for manual copy/paste
   *   instead of auto-submitting it to the back-end's `/hti/capture` endpoint.
   * @returns A Promise that resolves with the launch URL to open in the browser.
   */
  async getHtiLaunchUrl(debug: boolean): Promise<string> {
    const response = await firstValueFrom(this.http.get(this.urlHelper.getHtiLaunchUrlEndpoint(debug).href, {
      withCredentials: true,
      responseType: 'json'
    })) as { launchUrl: string };

    return response.launchUrl;
  }

  /**
   * Exchanges an HTI token with the back-end, which stores the citizen's Web ID on the session.
   * @param token - The base64-encoded HTI token (JWT) issued by the We Are PIMS.
   * @returns A Promise that resolves with the resolved Web ID.
   */
  async submitHtiToken(token: string): Promise<string> {
    const response = await firstValueFrom(this.http.post(this.urlHelper.getHtiTokenEndpoint().href, {
      token
    }, {
      withCredentials: true,
      responseType: 'json'
    })) as { webId: string };

    await this.getSessionInformation();

    return response.webId;
  }

  /**
   * Asks the back-end to verify the signature of the HTI token stored on the session
   * against the JWKS of its issuer.
   * @returns A Promise that resolves with the verification details.
   */
  async verifyHtiToken(): Promise<HtiTokenVerification> {
    const response = await firstValueFrom(this.http.post(this.urlHelper.getHtiTokenVerifyEndpoint().href, {}, {
      withCredentials: true,
      responseType: 'json'
    })) as HtiTokenVerification;

    await this.getSessionInformation();

    return response;
  }

  /**
   * Runs one of the back-end flow steps (mirroring the Postman collection) and
   * refreshes the session information containing the saved step summaries.
   * @param step - The flow step, e.g. 'oidc-configuration' or 'uma-ticket'.
   * @returns A Promise that resolves with the fields saved on the session for this step.
   */
  async runFlowStep<T = unknown>(step: string): Promise<T> {
    const response = await firstValueFrom(this.http.post(this.urlHelper.getFlowStepEndpoint(step).href, {}, {
      withCredentials: true,
      responseType: 'json'
    })) as T;

    await this.getSessionInformation();

    return response;
  }
}

/** Result of the back-end verification of the HTI token signature. */
export interface HtiTokenVerification {
  verified: boolean;
  issuer?: string;
  subject?: string;
  algorithm?: string;
  keyId?: string;
  expiresAt?: string;
  reason?: string;
}
