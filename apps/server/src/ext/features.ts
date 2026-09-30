import { Feature, FeatureKey } from '../common/features';

const implemented = new Set<FeatureKey>([
  Feature.PUBLIC_SPACE_APPEARANCE,
  Feature.SSO_CUSTOM,
  Feature.SSO_GOOGLE,
  Feature.MFA,
  Feature.API_KEYS,
  Feature.SCIM,
  Feature.SECURITY_SETTINGS,
  Feature.PAGE_PERMISSIONS,
  Feature.SHARING_CONTROLS,
  Feature.RETENTION,
  Feature.VIEWER_COMMENTS,
  Feature.PERSONAL_SPACES,
  Feature.OAUTH,
  Feature.AUDIT_LOGS,
  Feature.PAGE_VERIFICATION,
  Feature.TEMPLATES,
  Feature.COMMENT_RESOLUTION,
  Feature.SIEM,
  Feature.CONFLUENCE_IMPORT,
  Feature.DOCX_IMPORT,
  Feature.PDF_IMPORT,
  Feature.PDF_EXPORT,
  Feature.DOCX_EXPORT,
  Feature.ATTACHMENT_INDEXING,
  Feature.BASES,
  Feature.AI,
  Feature.AI_CONTROLS,
  Feature.MCP,
  Feature.MCP_CONTROLS,
]);

export function getImplementedFeatures(): FeatureKey[] {
  return [...implemented];
}

export function isImplemented(feature: string): boolean {
  return implemented.has(feature as FeatureKey);
}

export function enableFeatures(features: FeatureKey[]): void {
  for (const feature of features) {
    implemented.add(feature);
  }
}
