import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";

export function usePersonalSpaceQuery(enabled = true) {
  return useQuery({
    queryKey: ["personal-space"],
    queryFn: async () => {
      const req = await api.post("/personal-space");
      return req.data;
    },
    enabled,
  });
}

export function useCreatePersonalSpaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const req = await api.post("/personal-space/create");
      return req.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-space"] });
    },
  });
}
