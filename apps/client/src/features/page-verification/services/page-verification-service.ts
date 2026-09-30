import api from "@/lib/api-client";

export async function getVerificationList(params?: any) {
  const req = await api.post("/verifications", params);
  return req.data;
}
