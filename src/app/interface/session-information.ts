export interface SessionInformation {
  isLoggedIn: boolean,
  expirationDate?: string,
  accessGrantId?: string,
  accessGrantExpirationDate?: string,
  webId?: string
  pods?: string[]
}
