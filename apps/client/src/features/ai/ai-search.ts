import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { useCallback, useState } from "react";

const cache = new Map<string, any>();

export function hintVectorCache(_key?: string) {
  return cache;
}

export const hintVectorCacheMap = cache;

export function useAiSearch() {
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamingSources, setStreamingSources] = useState<any[]>([]);

  const mutation = useMutation({
    mutationFn: async (params: any) => {
      const req = await api.post("/ai/search", params);
      return req.data;
    },
  });

  const clearStreaming = useCallback(() => {
    setStreamingAnswer("");
    setStreamingSources([]);
  }, []);

  return {
    data: mutation.data,
    isPending: mutation.isPending,
    isLoading: mutation.isPending,
    mutate: mutation.mutate,
    reset: mutation.reset,
    error: mutation.error as any,
    streamingAnswer,
    streamingSources,
    clearStreaming,
    search: async (params: any) => mutation.mutateAsync(params),
  };
}

export function AiSearchResult({
  result,
  isLoading,
  streamingAnswer,
  streamingSources,
}: {
  result?: any;
  isLoading?: boolean;
  streamingAnswer?: string;
  streamingSources?: any[];
}) {
  if (isLoading && !streamingAnswer && !result) return "Searching…";
  if (streamingAnswer) return streamingAnswer;
  if (!result) return null;
  return result.answer ?? result.content ?? null;
}
