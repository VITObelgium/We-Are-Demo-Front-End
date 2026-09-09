export interface SessionInformation {
  isLoggedIn: boolean,
  authenticationMethod?: 'oidc' | 'hti',
  htiTokenVerified?: boolean,
  steps?: FlowSteps,
  expirationDate?: string,
  accessGrantId?: string,
  accessGrantExpirationDate?: string,
  webId?: string
  pods?: string[],
  clientId?: string,
  usingCustomCredentials?: boolean,
  tokens?: {
    accessToken: any,
    idToken: any
  }
}

/** Summaries of the executed flow steps, mirroring the Postman collection. */
export interface FlowSteps {
  oidcConfiguration?: {
    fetchedFrom: string,
    issuer?: string,
    authorizationEndpoint?: string,
    tokenEndpoint?: string,
    jwksUri?: string
  },
  clientAuthentication?: {
    tokenType?: string,
    expiresIn?: number,
    scope?: string,
    accessTokenPreview: string,
    idTokenPreview?: string,
    obtainedAt: string
  },
  vcConfiguration?: {
    fetchedFrom: string,
    issuerService?: string,
    derivationService?: string,
    queryService?: string
  },
  accessRequestId?: string,
  umaConfiguration?: {
    asUri: string,
    fetchedFrom: string,
    issuer?: string,
    tokenEndpoint?: string
  },
  umaTicket?: {
    resource: string,
    ticketPreview: string,
    obtainedAt: string
  },
  umaAccessToken?: {
    tokenType?: string,
    expiresIn?: number,
    accessTokenPreview: string,
    obtainedAt: string
  }
}
