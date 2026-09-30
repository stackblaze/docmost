import { Badge } from "@mantine/core";
import { useEffect, useState } from "react";
import api from "@/lib/api-client";

export function PageVerificationBadge({
  pageId,
  readOnly,
}: {
  pageId?: string;
  readOnly?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    if (!pageId || readOnly) return;
    api
      .post("/verifications/page", { pageId })
      .then((req) => setStatus((req.data as any)?.status ?? null))
      .catch(() => undefined);
  }, [pageId, readOnly]);
  if (!status) return null;
  return <Badge variant="light">{status}</Badge>;
}
