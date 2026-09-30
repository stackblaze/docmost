import api from "@/lib/api-client";
import { IPagination, QueryParams } from "@/lib/types";
import { IApiKey } from "./api-key.types";

export async function getApiKeys(params?: QueryParams): Promise<IPagination<IApiKey>> {
  const req = await api.post("/api-keys", { ...params });
  return req.data;
}
