import {Injectable, Inject} from "@angular/core";
import {AMA_ENDPOINT, BACKEND_URL, FRONTEND_URL} from "../tokens";
import {SessionService} from "../services/session.service";
import {SessionInformation} from "../interface/session-information";
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: "root"
})
export class UrlHelper {
  frontendUrl: URL;
  backendUrl: URL;
  amaEndpoint: URL;
  sessionInformation?: SessionInformation;

  constructor(@Inject(FRONTEND_URL) frontendUrl: URL, @Inject(BACKEND_URL) backendUrl: URL, @Inject(AMA_ENDPOINT) amaEndpoint: URL) {
    this.frontendUrl = frontendUrl;
    this.backendUrl = backendUrl;
    this.amaEndpoint = amaEndpoint;
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

  getAccessRequestConsentEndpoint(accessRequestId: string, flow?: string) {
    const endpoint = new URL(this.amaEndpoint.href);
    const redirectUrl = new URL(this.getFrontendEndpoint().href);
    if (flow) redirectUrl.searchParams.set('flow', flow);
    endpoint.searchParams.set('requestVcUrl', accessRequestId)
    endpoint.searchParams.set('redirectUrl', redirectUrl.href)
    return endpoint;
  }
}
