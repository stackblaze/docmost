import api from "@/lib/api-client";
import { IAuthProvider } from "./types";
import { IPagination } from "@/lib/types";

export async function getSsoProviders(): Promise<IPagination<IAuthProvider>> {
  const req = await api.post<IPagination<IAuthProvider>>("/sso/providers");
  return req.data;
}

export async function createSsoProvider(data: any): Promise<IAuthProvider> {
  const req = await api.post<IAuthProvider>("/sso/create", data);
  return req.data;
}

export async function updateSsoProvider(data: any): Promise<IAuthProvider> {
  const req = await api.post<IAuthProvider>("/sso/update", data);
  return req.data;
}

export async function deleteSsoProvider(providerId: string): Promise<void> {
  await api.post("/sso/delete", { providerId });
}

export async function ldapLogin(data: {
  providerId: string;
  username: string;
  password: string;
}): Promise<void> {
  await api.post("/sso/ldap", data);
}
