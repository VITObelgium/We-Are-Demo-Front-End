# Introduction

## We Are Project and We Are Platform

The We Are partnership, consisting of the Flemish Institute for Technological Research (VITO) – Flemish Patients' Platform (VPP) – Domus Medica (DM) – Zorgnet Icuro (ZI), is committed to enabling the ethical and safe reuse of personal health data for both public and private purposes, with the citizen at the center. The project collaborates closely with Athumi, the provider of the [SOLID](https://solidproject.org/TR/) data vault system in Flanders. This system allows citizens to securely store their data in vaults and share it with third parties based on consent. This project was made possible thanks to the European recovery fund; the Department of Economy, Science & Innovation; the Department of Care & the Department of Digital Flanders. More information at [www.we-are-health.be](https://www.we-are-health.be).

## What

This is the demo front end project for implementations on the We Are Platform. The front end is written in Angular and is responsible for

- calling authentication to the We Are Authentication endpoint
- Trigger Access Request for the backend application
- writing data to the user's pod
- reading data from the user's pod
- initiating an access request to the data created in the user's pod by calling the We Are Access request endpoint.

## Setup

Run `npm install` to install all dependencies for the project.

Provide an environment using DotEnv, an example can be found in the `.env.example` file. To use the defaults simply copy the `.env.example` file to a new file `.env`.
The environment determines how to reach your We Are Demo Back-End application instance.

Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Authentication

Authentication in We Are is implemented based on the [Solid OIDC](https://solidproject.org/TR/oidc) flow. We Are uses as IDP [ACM](https://www.vlaanderen.be/digitaal-vlaanderen/onze-diensten-en-platformen/veiligheidsbouwstenen-applicatie-en-platformdiensten/toegangsbeheer) to identify and validate the authenticity of the user. The We Are Authentication module provides a straightforward procedure for registered third-party applications to initiate the login process using ACM. Upon successful authentication, the user will return as an authenticated user with an active session on the We Are platform. Below are code examples demonstrating how to implement this authentication flow in your application.

The login flow is triggered via the front end on the ```main.component.html``` by calling the function ```login()```. This will trigger ```login()``` on the SessionService, which will redirect the user to the login endpoint:

```
    window.location.href = this.urlHelper.getLoginEndpoint().href;
```
which is implemented in the WeAre-Demo-Backend application. This will start the login flow and the user will return with an authenticated session.

## Triggering Access Request

Next step is the triggering of an [Access Request](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/manage-access-requests-grants/) to let the user grant access to the WeAre-Demo-Backend to write to the pod. The flow consists of two parts: first the access request is created and then with that access request the user is redirected to the We Are Access Management Application to approve the request and an Access Grant is created. The Access Grant can then be used by the WeAre-Demo-Backend to access the user's pod. 

The Access Request creation is found in the ```main.component.ts```:
```
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
```
As you see in the code, upon recieving the accessRequest, it's used to redirect the user with the accessRequest to the We Are consent endpoint.

## Writing data to the user's pod

An example dataset can be written to the pod via the function ```writeDataSet``` in the ```main.component.ts```:

```  
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
This logic uses the function [createSolidDataset](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-data/) from the Inrupt SDK. 


## Reading data from the pod

To illustrate a read of data from the pod, we will read the data that was just written to the pod via the following code:
```
  /**
   * Reads a Solid dataset from the Pod and displays it in Turtle format.
   */
  async readDataset() {
    const solidDataset = await this.podService.getSolidDatasetRelative('book_index');
    this.readTurtle = await solidDatasetAsTurtle(solidDataset);
  }

```