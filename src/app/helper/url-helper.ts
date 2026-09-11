import {Injectable, Inject} from "@angular/core";
import {BACKEND_URL, FRONTEND_URL} from "../tokens";
import {SessionService} from "../services/session.service";
import {SessionInformation} from "../interface/session-information";
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: "root"
})
export class UrlHelper {
  frontendUrl: URL;
  backendUrl: URL;
  sessionInformation?: SessionInformation;

  constructor(@Inject(FRONTEND_URL) frontendUrl: URL, @Inject(BACKEND_URL) backendUrl: URL) {
    this.frontendUrl = frontendUrl;
    this.backendUrl = backendUrl;
  }

  getFrontendEndpoint() {
    return this.frontendUrl;
  }

  getLoginEndpoint(switchIdentity?: boolean) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'login'
    if(switchIdentity) endpoint.searchParams.set('switchIdentity', 'true')
    return endpoint;
  }

  getSaveTokensEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'login'
    endpoint.searchParams.set('saveTokens', 'true')
    return endpoint;
  }

  getLogoutEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'logout'
    return endpoint;
  }

  getSessionInformationEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'session-information'
    return endpoint;
  }

  getSessionResetEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'session/reset'
    return endpoint;
  }

  getPodAccessGrantEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'pod-access-grant'
    return endpoint;
  }

  getReadEndpoint(resourceUrl: URL) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'read';
    endpoint.searchParams.set("resourceUrl", resourceUrl.href);
    return endpoint;
  }

  getWriteEndpoint(resourceUrl: URL) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'write';
    endpoint.searchParams.set("resourceUrl", resourceUrl.href);
    return endpoint;
  }

  getAccessRequestEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'access-request';
    return endpoint;
  }

  getAccessGrantEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'access-grant';
    return endpoint;
  }

  getClientCredentialsEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'client-credentials';
    return endpoint;
  }

  getClientCredentialOptionsEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'client-credentials/options';
    return endpoint;
  }

  getHtiLaunchUrlEndpoint(debug?: boolean) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'hti/launch-url';
    if (debug !== undefined) endpoint.searchParams.set('debug', debug ? 'true' : 'false');
    return endpoint;
  }

  getHtiTokenEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'hti/token';
    return endpoint;
  }

  getHtiTokenVerifyEndpoint() {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'hti/token/verify';
    return endpoint;
  }

  getFlowStepEndpoint(step: string) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = `flow/${step}`;
    return endpoint;
  }

  getAccessRequestConsentEndpoint(flow?: string) {
    const endpoint = new URL(this.backendUrl.href);
    endpoint.pathname = 'access-request/consent';
    if (flow) endpoint.searchParams.set('flow', flow);
    return endpoint;
  }
}
