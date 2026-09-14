/** The We Are platform environments supported by the back-end. */
export type WeAreEnvironment = 'DEV' | 'TST' | 'ACC' | 'PRD';

/** A configured client credential pair, without exposing the secret. */
export interface ClientCredentialOption {
  index: number,
  displayName: string
}

/** Indicator that custom (volatile, session-only) credentials were previously entered for an environment. */
export interface CustomCredentialIndicator {
  displayName: string
}

/** Response of GET /client-credentials/options. */
export interface ClientCredentialOptions {
  environments: WeAreEnvironment[],
  clientsByEnvironment: Record<WeAreEnvironment, ClientCredentialOption[]>,
  /** Per environment, whether custom (volatile) credentials were previously entered for it. */
  customCredentialsByEnvironment: Partial<Record<WeAreEnvironment, CustomCredentialIndicator>>,
  active: {
    environment: WeAreEnvironment,
    clientIndex?: number,
    displayName: string,
    usingCustomCredentials: boolean
  }
}

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
  environment?: WeAreEnvironment,
  clientIndex?: number,
  clientDisplayName?: string,
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
