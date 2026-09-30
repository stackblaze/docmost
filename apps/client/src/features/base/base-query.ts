import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";

export function useBaseQuery(pageId: string) {
  return useQuery({
    queryKey: ["base", pageId],
    queryFn: async () => {
      const req = await api.post("/bases/info", { pageId });
      return req.data;
    },
    enabled: Boolean(pageId),
  });
}

export function useConvertPageToBaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { pageId: string; template?: string }) => {
      const pageId = typeof input === "string" ? input : input.pageId;
      const template = typeof input === "string" ? undefined : input.template;
      const req = await api.post("/bases/convert", { pageId, template });
      return req.data;
    },
    onSuccess: (_data, input) => {
      const pageId = typeof input === "string" ? input : input.pageId;
      queryClient.invalidateQueries({ queryKey: ["base", pageId] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}
