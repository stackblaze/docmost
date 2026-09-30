import { Button, Stack, Text } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api-client";

export default function OAuthConsentPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const scope = params.get("scope") || "read";
  const state = params.get("state") || undefined;

  return (
    <Stack p="xl" maw={480} mx="auto">
      <Text fw={600}>{t("Authorize application")}</Text>
      <Text size="sm">
        {t("This application wants access to your workspace.")} ({scope})
      </Text>
      <Button
        onClick={async () => {
          const req = await api.post("/oauth/authorize", {
            clientId,
            redirectUri,
            scope,
            state,
          });
          window.location.href = (req.data as any).redirectUri;
        }}
      >
        {t("Allow")}
      </Button>
    </Stack>
  );
}
