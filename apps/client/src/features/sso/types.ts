export enum SSO_PROVIDER {
  OIDC = "oidc",
  SAML = "saml",
  GOOGLE = "google",
  LDAP = "ldap",
}

export interface IAuthProvider {
  id: string;
  name: string;
  type: SSO_PROVIDER;
  samlUrl?: string;
  samlCertificate?: string;
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  ldapUrl?: string;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapBaseDn?: string;
  ldapUserSearchFilter?: string;
  ldapUserAttributes?: any;
  ldapTlsEnabled?: boolean;
  ldapTlsCaCert?: string;
  allowSignup: boolean;
  isEnabled: boolean;
  groupSync?: boolean;
  creatorId?: string;
  workspaceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  providerId?: string;
}
