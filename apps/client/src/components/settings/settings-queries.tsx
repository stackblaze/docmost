import { queryClient } from "@/main.tsx";
import {
  getBilling,
  getBillingPlans,
} from "@/ee/billing/services/billing-service.ts";
import { getSpaces } from "@/features/space/services/space-service.ts";
import { getGroups } from "@/features/group/services/group-service.ts";
import { QueryParams } from "@/lib/types.ts";
import { getWorkspaceMembers } from "@/features/workspace/services/workspace-service.ts";
import { getLicenseInfo } from "@/ee/licence/services/license-service.ts";
import { getSsoProviders } from "@/features/sso/sso-service";
import { getShares } from "@/features/share/services/share-service.ts";
import { getApiKeys } from "@/features/api-key/api-key-service";
import api from "@/lib/api-client";
import { getVerificationList } from "@/features/page-verification/services/page-verification-service";

async function getAuditLogs(params?: any) {
  const req = await api.post("/audit", params);
  return req.data;
}

async function getScimTokens(params?: any) {
  const req = await api.post("/scim-tokens", params);
  return req.data;
}

export const prefetchWorkspaceMembers = () => {
  const params: QueryParams = { limit: 100, query: "" };
  queryClient.prefetchQuery({
    queryKey: ["workspaceMembers", params],
    queryFn: () => getWorkspaceMembers(params),
  });
};

export const prefetchSpaces = () => {
  queryClient.prefetchQuery({
    queryKey: ["spaces", {}],
    queryFn: () => getSpaces({}),
  });
};

export const prefetchGroups = () => {
  queryClient.prefetchQuery({
    queryKey: ["groups", {}],
    queryFn: () => getGroups({}),
  });
};

export const prefetchBilling = () => {
  queryClient.prefetchQuery({
    queryKey: ["billing"],
    queryFn: () => getBilling(),
  });

  queryClient.prefetchQuery({
    queryKey: ["billing-plans"],
    queryFn: () => getBillingPlans(),
  });
};

export const prefetchLicense = () => {
  queryClient.prefetchQuery({
    queryKey: ["license"],
    queryFn: () => getLicenseInfo(),
  });
};

export const prefetchSsoProviders = () => {
  queryClient.prefetchQuery({
    queryKey: ["sso-providers"],
    queryFn: () => getSsoProviders(),
  });
};

export const prefetchShares = () => {
  queryClient.prefetchQuery({
    queryKey: ["share-list", {}],
    queryFn: () => getShares({}),
  });
};

export const prefetchApiKeys = () => {
  queryClient.prefetchQuery({
    queryKey: ["api-key-list", {}],
    queryFn: () => getApiKeys({}),
  });
};

export const prefetchApiKeyManagement = () => {
  queryClient.prefetchQuery({
    queryKey: ["api-key-list", { adminView: true }],
    queryFn: () => getApiKeys({ adminView: true }),
  });
};

export const prefetchAuditLogs = () => {
  const params = { limit: 50 };
  queryClient.prefetchQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => getAuditLogs(params),
  });
};

export const prefetchVerifiedPages = () => {
  const params = { limit: 50 };
  queryClient.prefetchQuery({
    queryKey: ["verification-list", params],
    queryFn: () => getVerificationList(params),
  });
};

export const prefetchScimTokens = () => {
  queryClient.prefetchQuery({
    queryKey: ["scim-token-list", { cursor: undefined }],
    queryFn: () => getScimTokens({}),
  });
};
