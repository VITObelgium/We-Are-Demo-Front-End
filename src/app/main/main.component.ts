/**
 * Main component of the application, providing user interactions and managing sessions.
 *
 * It visualizes the two supported authentication flows (OIDC and HTI) as step-by-step
 * wizards, and allows setting custom client credentials on the back-end session.
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
import { SessionService, HtiTokenVerification } from "../services/session.service";
import { SessionInformation, FlowSteps, ClientCredentialOptions, WeAreEnvironment, ClientCredentialOption } from "../interface/session-information";
import { UrlHelper } from "../helper/url-helper";
import { VcService } from "../services/vc.service";
import { AccessGrant } from "@inrupt/solid-client-access-grants";

/** The two flows demonstrated by this front-end. */
export type Flow = 'oidc' | 'hti';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css'],
    standalone: false
})
export class MainComponent implements OnInit {

  /** Session information about the current user */
  sessionInformation?: SessionInformation;

  /** The currently selected flow tab */
  activeTab: Flow = 'oidc';

  /** Client credentials form state */
  clientId = '';
  clientSecret = '';
  clientDisplayName = '';
  credentialsBusy = false;

  /** Environment/client switcher state */
  credentialOptions?: ClientCredentialOptions;
  selectedEnvironment: WeAreEnvironment = 'ACC';
  /** Bound to the "Client" select: either a configured client index, or `CUSTOM_CLIENT_OPTION`. */
  selectedClientOption?: number | 'custom';
  environmentBusy = false;

  /** Sentinel value used by the client `<select>` to represent the (volatile) "custom credentials" option. */
  readonly CUSTOM_CLIENT_OPTION = 'custom' as const;

  /** Client options available for the currently selected environment. */
  get clientOptionsForSelectedEnvironment(): ClientCredentialOption[] {
    return this.credentialOptions?.clientsByEnvironment?.[this.selectedEnvironment] ?? [];
  }

  /** Whether custom (volatile, session-only) credentials were previously entered for the selected environment. */
  get hasCustomCredentialsForSelectedEnvironment(): boolean {
    return !!this.credentialOptions?.customCredentialsByEnvironment?.[this.selectedEnvironment];
  }

  /** Display name of the volatile custom credentials stored for the selected environment, if any. */
  get customCredentialsDisplayNameForSelectedEnvironment(): string | undefined {
    return this.credentialOptions?.customCredentialsByEnvironment?.[this.selectedEnvironment]?.displayName;
  }

  /** HTI flow state */
  htiLaunchUrl?: string;
  htiLaunchOpened = false;
  htiToken = '';
  htiVerification?: HtiTokenVerification;
  /** Whether the PIMS should show the HTI token on screen (manual copy/paste) instead of auto-submitting it. */
  htiDebug = false;

  /** Turtle representation of datasets written to / read from the Pod, per flow */
  writtenTurtle: Partial<Record<Flow, string>> = {};
  readTurtle: Partial<Record<Flow, string>> = {};

  accessGrants?: AccessGrant[];

  /** Whether a session reset request is in progress. */
  sessionResetBusy = false;

  /** Name of the action currently in progress (used to show busy state) */
  busyAction?: string;

  /** The last error that occurred, shown to the user */
  errorMessage?: string;

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

      // Keep the tab in sync with the authentication method used.
      if (sessionInformation?.authenticationMethod === 'hti') {
        this.activeTab = 'hti';
      }
    });

    await this.loadCredentialOptions();

    this.route.queryParams.subscribe(async params => {
      if (params['flow'] === 'hti' || params['flow'] === 'oidc') {
        this.activeTab = params['flow'];
      }

      // Returning from the PIMS launch page after it auto-submitted the HTI token to the
      // back-end's /hti/capture endpoint, which redirected the browser back here.
      if (params['hti-captured'] === 'true') {
        this.htiLaunchOpened = true;
        await this.sessionService.getSessionInformation();
      } else if (params['hti-captured'] === 'false') {
        this.errorMessage = params['hti-error']
          ? `Capturing the HTI token failed: ${params['hti-error']}`
          : 'Capturing the HTI token failed.';
      }

      if (params['access-grant-id']) {
        await firstValueFrom(this.sessionService.sessionInformation$.pipe(filter(sessionInformation => sessionInformation !== undefined))); // Wait for the session information to be loaded
        await this.setPodAccessGrant(params['access-grant-id']);
      }
    });
  }

  selectTab(tab: Flow) {
    this.activeTab = tab;
    this.errorMessage = undefined;
  }

  /** Whether the citizen is authenticated via the flow of the given tab. */
  isAuthenticated(flow: Flow): boolean {
    return !!this.sessionInformation?.isLoggedIn && this.sessionInformation?.authenticationMethod === flow;
  }

  /** Whether an access grant is available on the back-end session. */
  get hasAccessGrant(): boolean {
    return !!this.sessionInformation?.accessGrantId;
  }

  /** Whether the HTI token on the back-end session has a verified signature. */
  get htiTokenVerified(): boolean {
    return !!this.sessionInformation?.htiTokenVerified;
  }

  /** Summaries of the flow steps executed on the back-end session. */
  get steps(): FlowSteps {
    return this.sessionInformation?.steps ?? {};
  }

  /** Whether the citizen's Web ID and pod are known on the session. */
  get hasPod(): boolean {
    return !!this.sessionInformation?.webId && !!this.sessionInformation?.pods?.length;
  }

  /**
   * Runs one of the back-end flow steps (mirroring the Postman collection).
   * The saved fields are shown from the refreshed session information.
   */
  async runStep(step: string) {
    this.busyAction = step;
    this.errorMessage = undefined;
    try {
      await this.sessionService.runFlowStep(step);
    } catch (error) {
      this.handleError(`Step '${step}' failed.`, error);
    } finally {
      this.busyAction = undefined;
    }
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
   * Resets the flow-related session data on the back-end (OIDC/HTI authentication state, flow
   * step summaries, access grants, tokens, ...), so the flow can be restarted from scratch.
   * The active environment/client credentials selection is left untouched.
   */
  async resetSession() {
    this.sessionResetBusy = true;
    this.errorMessage = undefined;
    try {
      await this.sessionService.resetSession();
      this.resetLocalFlowState();
    } catch (error) {
      this.handleError('Resetting the session failed.', error);
    } finally {
      this.sessionResetBusy = false;
    }
  }

  /**
   * Clears local, front-end-only flow state (not persisted on the session) that would
   * otherwise become stale after a session reset or an environment/client switch.
   */
  private resetLocalFlowState() {
    this.htiLaunchUrl = undefined;
    this.htiLaunchOpened = false;
    this.htiToken = '';
    this.htiVerification = undefined;
    this.writtenTurtle = {};
    this.readTurtle = {};
    this.accessGrants = undefined;
    this.errorMessage = undefined;
  }

  /**
   * Loads the available We Are environments and, per environment, the configured client
   * credential pairs, syncing the switcher's selection with the session's currently active
   * environment/client.
   */
  async loadCredentialOptions() {
    try {
      this.credentialOptions = await this.sessionService.getClientCredentialOptions();
      this.selectedEnvironment = this.credentialOptions.active.environment;
      this.selectedClientOption = this.credentialOptions.active.usingCustomCredentials
        ? this.CUSTOM_CLIENT_OPTION
        : this.credentialOptions.active.clientIndex;
    } catch (error) {
      this.handleError('Loading the available environments failed.', error);
    }
  }

  /**
   * Switches the active We Are environment. Prefers the volatile custom credentials previously
   * entered for that environment (if any), otherwise selects the first configured client
   * credential pair for it.
   */
  async selectEnvironment(environment: WeAreEnvironment) {
    this.selectedEnvironment = environment;

    if (this.hasCustomCredentialsForSelectedEnvironment) {
      await this.selectCustomCredentials();
      return;
    }

    const firstOption = this.clientOptionsForSelectedEnvironment[0];
    if (!firstOption) return;

    await this.selectClient(firstOption.index);
  }

  /**
   * Handles a change of the "Client" select: either a configured client index, or the sentinel
   * value representing the volatile custom credentials stored for the selected environment.
   */
  async selectClientOption(value: number | 'custom') {
    if (value === this.CUSTOM_CLIENT_OPTION) {
      await this.selectCustomCredentials();
    } else {
      await this.selectClient(Number(value));
    }
  }

  /**
   * Selects one of the environment's configured client credential pairs as active for this session.
   */
  async selectClient(clientIndex: number) {
    this.environmentBusy = true;
    this.errorMessage = undefined;
    try {
      await this.sessionService.selectClientCredentials(this.selectedEnvironment, clientIndex);
      this.selectedClientOption = clientIndex;
      this.resetLocalFlowState();
      await this.loadCredentialOptions();
    } catch (error) {
      this.handleError('Switching the environment/client failed.', error);
    } finally {
      this.environmentBusy = false;
    }
  }

  /**
   * Re-selects the volatile custom credentials previously entered for the selected environment,
   * without having to re-type the client secret.
   */
  async selectCustomCredentials() {
    this.environmentBusy = true;
    this.errorMessage = undefined;
    try {
      await this.sessionService.selectCustomClientCredentials(this.selectedEnvironment);
      this.selectedClientOption = this.CUSTOM_CLIENT_OPTION;
      this.resetLocalFlowState();
      await this.loadCredentialOptions();
    } catch (error) {
      this.handleError('Switching the environment/client failed.', error);
    } finally {
      this.environmentBusy = false;
    }
  }

  /**
   * Stores the entered client credentials on the back-end session, for the currently selected
   * environment. Subsequent back-end calls use these credentials instead of the default ones.
   * These credentials are volatile: they only live on the session, not in the back-end's `.env`.
   */
  async saveClientCredentials() {
    if (!this.clientId || !this.clientSecret) return;

    this.credentialsBusy = true;
    this.errorMessage = undefined;
    try {
      await this.sessionService.setClientCredentials(this.clientId, this.clientSecret, this.selectedEnvironment, this.clientDisplayName || undefined);
      this.clientSecret = '';
      this.resetLocalFlowState();
      await this.loadCredentialOptions();
    } catch (error) {
      this.handleError('Saving the client credentials failed.', error);
    } finally {
      this.credentialsBusy = false;
    }
  }

  /**
   * Removes the custom client credentials from the back-end session.
   */
  async resetClientCredentials() {
    this.credentialsBusy = true;
    this.errorMessage = undefined;
    try {
      await this.sessionService.clearClientCredentials();
      this.clientId = '';
      this.clientSecret = '';
      this.clientDisplayName = '';
      this.resetLocalFlowState();
      await this.loadCredentialOptions();
    } catch (error) {
      this.handleError('Resetting the client credentials failed.', error);
    } finally {
      this.credentialsBusy = false;
    }
  }

  /**
   * Fetches the We Are PIMS HTI launch URL. The `redirect_uri` points to the back-end's
   * own `/hti/capture` endpoint, so the launch page auto-submits the token there unless
   * debug mode is enabled.
   */
  async fetchHtiLaunchUrl() {
    this.busyAction = 'hti-launch-url';
    this.errorMessage = undefined;
    try {
      this.htiLaunchUrl = await this.sessionService.getHtiLaunchUrl(this.htiDebug);
    } catch (error) {
      this.handleError('Fetching the HTI launch URL failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Opens the We Are PIMS HTI launch page. In debug mode this happens in a new tab, since
   * the citizen still needs to paste the shown token below. Otherwise, this navigates in
   * the same tab: the PIMS auto-submits the token to the back-end, which redirects the
   * citizen straight back here once the Web ID has been captured.
   */
  async openHtiLaunch() {
    this.busyAction = 'hti-launch';
    this.errorMessage = undefined;
    try {
      this.htiLaunchUrl = await this.sessionService.getHtiLaunchUrl(this.htiDebug);
      this.htiLaunchOpened = true;
      if (this.htiDebug) {
        window.open(this.htiLaunchUrl, '_blank', 'noopener');
      } else {
        window.location.href = this.htiLaunchUrl;
      }
    } catch (error) {
      this.handleError('Fetching the HTI launch URL failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Exchanges the pasted HTI token with the back-end, saving the citizen's Web ID on the session.
   */
  async submitHtiToken() {
    if (!this.htiToken) return;

    this.busyAction = 'hti-token';
    this.errorMessage = undefined;
    try {
      await this.sessionService.submitHtiToken(this.htiToken);
      this.htiToken = '';
      this.htiVerification = undefined;
    } catch (error) {
      this.handleError('Exchanging the HTI token failed. Verify the pasted token.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Asks the back-end to verify the signature of the HTI token on the session
   * against the JWKS published by the token issuer.
   */
  async verifyHtiToken() {
    this.busyAction = 'hti-verify';
    this.errorMessage = undefined;
    try {
      this.htiVerification = await this.sessionService.verifyHtiToken();
    } catch (error) {
      this.handleError('Verification of the HTI token failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Creates a Solid dataset with sample RDF data and writes it to the Pod.
   */
  async writeDataset() {
    this.busyAction = 'write';
    this.errorMessage = undefined;
    try {
      let dataset = createSolidDataset();
      let book = createThing({ name: "example_poetry" });
      book = addStringNoLocale(book, "http://schema.org/name", "ZYX987 of Example Poetry");
      book = addUrl(book, "https://www.w3.org/1999/02/22-rdf-syntax-ns#type", "https://schema.org/Book");
      dataset = setThing(dataset, book);

      await this.podService.writeSolidDatasetRelative('book_index', dataset);
      this.writtenTurtle[this.activeTab] = await solidDatasetAsTurtle(dataset);
    } catch (error) {
      this.handleError('Writing data to the pod failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Reads a Solid dataset from the Pod and displays it in Turtle format.
   */
  async readDataset() {
    this.busyAction = 'read';
    this.errorMessage = undefined;
    try {
      const solidDataset = await this.podService.getSolidDatasetRelative('book_index');
      this.readTurtle[this.activeTab] = await solidDatasetAsTurtle(solidDataset);
    } catch (error) {
      this.handleError('Reading data from the pod failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Creates a Pod Access Request (PAR) via the back-end. The access request ID is
   * saved on the session; the consent redirect is a separate step.
   */
  async createAccessRequest() {
    this.busyAction = 'access-request';
    this.errorMessage = undefined;
    try {
      await this.vcService.issuePodAccessRequest();
      await this.sessionService.getSessionInformation();
    } catch (error) {
      this.handleError('Issuing the access request failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Redirects the citizen to the Access Management Application to consent
   * to the access request created in the previous step.
   */
  goToConsent() {
    if (!this.steps.accessRequestId) return;
    this.busyAction = 'consent';
    window.location.href = this.urlHelper.getAccessRequestConsentEndpoint(this.activeTab).href;
  }

  /**
   * Initiates the Authorization Code flow and saves the tokens to the session.
   */
  async saveTokensToSession() {
    this.sessionService.saveTokens();
  }

  /**
   * Sets a Pod Access Grant received from the user, updating the session information.
   */
  async setPodAccessGrant(accessGrantId: string) {
    return this.vcService.setPodAccessGrant(accessGrantId!).then(async () => {
      await this.sessionService.getSessionInformation();
    }).catch((error) => {
      this.handleError('Saving the access grant on the session failed.', error);
    });
  }

  async retrieveAccessGrants() {
    this.busyAction = 'access-grants';
    this.errorMessage = undefined;
    try {
      this.accessGrants = await this.vcService.getAccessGrants();
    } catch (error) {
      this.handleError('Retrieving the access grants failed.', error);
    } finally {
      this.busyAction = undefined;
    }
  }

  /**
   * Extracts a human-readable reason from a failed HTTP request.
   * Prefers a reason supplied by the back-end (a JSON body with `reason`/`message`/
   * `error_description`, or a plain-text body), and falls back to the transport-level
   * failure so a reason is always shown.
   */
  private extractErrorReason(error: unknown): string | undefined {
    const httpError = error as { error?: unknown; message?: string; statusText?: string; status?: number };
    const body = httpError?.error;

    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (body instanceof Error && body.message?.trim()) {
      return body.message.trim();
    }
    if (body && typeof body === 'object') {
      const { reason, message, error_description } = body as { reason?: string; message?: string; error_description?: string };
      const fromBody = reason?.trim() || message?.trim() || error_description?.trim();
      if (fromBody) return fromBody;
    }

    if (httpError?.status === 0) {
      return 'The back-end could not be reached.';
    }
    return httpError?.message?.trim() || httpError?.statusText?.trim() || undefined;
  }

  private handleError(message: string, error: unknown) {
    console.error(message, error);
    const reason = this.extractErrorReason(error);
    this.errorMessage = reason ? `${message} Reason: ${reason}` : message;

    // The error banner sits at the top of the page, so scroll it into view: a step further
    // down the flow may otherwise fail without the citizen noticing.
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  protected readonly JSON = JSON;
}
