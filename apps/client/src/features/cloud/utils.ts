import { getServerAppUrl, getSubdomainHost } from "@/lib/config.ts";

export function getHostnameUrl(hostname?: string): string {
  if (!hostname) {
    return window.location.origin;
  }
  const url = new URL(getServerAppUrl());
  const protocol = url.protocol === "https:" ? "https" : "http";
  return `${protocol}://${hostname}.${getSubdomainHost()}`;
}

export function exchangeTokenRedirectUrl(
  hostname?: string,
  exchangeToken?: string,
) {
  if (!hostname || !exchangeToken) {
    return "/";
  }
  return getHostnameUrl(hostname) + "/api/auth/exchange?token=" + exchangeToken;
}
