# Introduction

## We Are Project and We Are Platform

The We Are partnership, consisting of the Flemish Institute for Technological Research (VITO) – Domus Medica (DM) – Zorgnet Icuro (ZI), is committed to enabling the ethical and safe reuse of personal health data for both public and private purposes, with the citizen at the center. The project collaborates closely with Athumi, the provider of the [SOLID](https://solidproject.org/TR/) data vault system in Flanders. This system allows citizens to securely store their data in vaults and share it with third parties based on consent. This project was made possible thanks to the European recovery fund; the Department of Economy, Science & Innovation; the Department of Care & the Department of Digital Flanders. More information at [www.we-are-health.be](https://www.we-are-health.be).

## What

This is the We Are Demo Front-End, an Angular application that showcases an example implementation on the We Are platform. It is the browser-facing counterpart of the We Are Demo Back-End: all interactions with the SOLID (Social Linked Data) ecosystem — authentication, verifiable credentials and vault (pod) access — are delegated to the back end over HTTP; this front end never talks to the vault directly.

It demonstrates:

- authenticating a citizen via the Solid OIDC flow, or alternatively via the HTI (Health Tools Interoperability) flow
- issuing an access request (verifiable credential) and acquiring consent via the We Are Access Management Application (AMA)
- setting and listing access grants
- writing an RDF dataset to and reading it from the citizen's vault

# Setup

Run `npm install` to install all dependencies for the project.

Provide an environment using DotEnv: copy the `.env.example` file to a new `.env` file. The variables determine how to reach your We Are Demo Back-End instance (`BACKEND_URL`) and the host/port of this application itself (`HOST`, `PROTOCOL`, `PORT`). All We Are platform endpoints (OpenID provider, AMA, PIMS, VC service, ...) are configured on the back end, not here. A `prestart` hook (`prestart/prestart.mjs`) validates the environment and prefills `src/environments/environment.ts` with these values before serving.

Run `npm run start` for a dev server and navigate to the configured host and port (default `http://localhost:4200/`). The app will automatically reload if you change any of the source files.

# Functionality

The UI (`main.component.html`) offers a set of buttons that each trigger one step of the demo. The sections below describe them in the order of a typical run.

## Authentication (Solid OIDC flow)

Authentication in We Are is implemented based on the [Solid OIDC](https://solidproject.org/TR/oidc) flow. We Are uses [ACM](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/veiligheidsbouwstenen-applicatie-en-platformdiensten/toegangsbeheer) as IDP to identify and validate the authenticity of the user.

The front end does not implement the OIDC protocol itself: **Log in** (`SessionService.login()`) navigates the browser to the back end's `/login` endpoint, which starts the flow and eventually redirects the citizen back with an authenticated session:

```ts
login(): void {
  window.location.href = this.urlHelper.getLoginEndpoint().href;
}
```

Related actions:

- **Switch identity** — calls `/login?switchIdentity=true`, forcing an account/target-group switch at the identity provider. This is a temporary workaround for when the citizen's vault and Web ID were removed in another We Are client application.
- **Log out** — navigates to the back end's `/logout` endpoint, which clears the session.
- **Print tokens** — calls `/login?saveTokens=true` so the back end stores the ID and access token on the session, after which they are displayed.

The session state itself is polled from the back end's `/session-information` endpoint (`SessionService.getSessionInformation()`) and exposed to all components as an RxJS `BehaviorSubject`.

## Authentication (HTI flow)

As an alternative to the full Solid OIDC login, a citizen can be authenticated via the HTI (Health Tools Interoperability) flow. The citizen is sent to the We Are PIMS HTI launch page (URL obtained from the back end's `/hti/launch-url` endpoint), authenticates there, and the PIMS issues an HTI token (a JWT) containing the citizen's Web ID. The token is delivered to the back end — either auto-submitted to its `/hti/capture` endpoint, or (in debug mode) copy/pasted and exchanged via `/hti/token` — after which the Web ID is available on the session and the access request, access grant and vault operations below work exactly the same. The token's signature can additionally be verified via `/hti/token/verify`. See the We Are Demo Back-End README for the details of these endpoints.

## Issuing an access request and acquiring consent

Before the back end can act on the citizen's vault, the citizen must grant it access. This uses [access requests and access grants](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/manage-access-requests-grants/) (verifiable credentials) and consists of two parts:

1. **Issue access request** (`VcService.issuePodAccessRequest()`) — posts the requested resources (the root vault URL), the citizen's Web ID, a purpose, an expiration date and the access modes (read/write/append) to the back end's `/access-request` endpoint. The result is an [AccessRequest](https://docs.inrupt.com/developer-tools/api/javascript/solid-client-access-grants/modules/gConsent.html#accessrequest).
2. The browser is then redirected to the We Are Access Management Application (AMA) with the access request ID, so the citizen can approve it. The AMA location is configured on the back end (see its `/access-request/consent` endpoint), not in this front end. After consent the AMA redirects back to this front end with an `access-grant-id` query parameter.

On return, `MainComponent` picks up the `access-grant-id` and posts it to the back end's `/access-grant` endpoint (`VcService.setPodAccessGrant()`), which fetches the [AccessGrant](https://docs.inrupt.com/developer-tools/api/javascript/solid-client-access-grants/modules/gConsent.html#accessgrant) and stores it on the session for subsequent vault access.

**Retrieve access grants** lists all access grants issued for the citizen's Web ID via `GET /access-grant`.

## Writing data to the vault

**Write data to Pod** builds an example RDF dataset with [createSolidDataset](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-data/) from the Inrupt SDK and sends it, serialized as Turtle, to the back end's `/write` endpoint (`PodService.writeSolidDatasetRelative()`):

```ts
async writeDataset() {
  let dataset = createSolidDataset();
  let book = createThing({ name: "example_poetry" });
  book = addStringNoLocale(book, "http://schema.org/name", "ZYX987 of Example Poetry");
  book = addUrl(book, "https://www.w3.org/1999/02/22-rdf-syntax-ns#type", "https://schema.org/Book");
  dataset = setThing(dataset, book);

  await this.podService.writeSolidDatasetRelative('book_index', dataset);
  this.writtenTurtle = await solidDatasetAsTurtle(dataset);
}
```

The resource is written relative to the citizen's root vault URL (taken from the session information).

## Reading data from the vault

**Read data from Pod** reads the resource back through the back end's `/read` endpoint and displays it in Turtle format:

```ts
async readDataset() {
  const solidDataset = await this.podService.getSolidDatasetRelative('book_index');
  this.readTurtle = await solidDatasetAsTurtle(solidDataset);
}
```

# Project structure

- `src/app/services/session.service.ts` — session state, login/logout/switch identity
- `src/app/services/vc.service.ts` — access requests and access grants
- `src/app/services/pod.service.ts` — reading and writing vault resources (as Turtle)
- `src/app/helper/url-helper.ts` — builds the back-end endpoint URLs
- `src/app/main/` — the main demo component (UI and orchestration)
