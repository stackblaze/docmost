import { Button, Container, PinInput, Stack, Title } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api-client";
import { getPostLoginRedirect } from "@/lib/app-route";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";

export default function MfaChallengePage() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const submit = async () => {
    try {
      await api.post("/mfa/verify", { code });
      navigate(getPostLoginRedirect());
    } catch (err: any) {
      notifications.show({
        message: err?.response?.data?.message || t("Invalid code"),
        color: "red",
      });
    }
  };

  return (
    <Container size={420} mt="xl">
      <Stack>
        <Title order={2}>{t("Enter your authentication code")}</Title>
        <PinInput length={6} value={code} onChange={setCode} />
        <Button onClick={submit}>{t("Verify")}</Button>
      </Stack>
    </Container>
  );
}

export function MfaChallengePageNamed() {
  return <MfaChallengePage />;
}
