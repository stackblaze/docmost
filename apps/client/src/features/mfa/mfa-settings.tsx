import { Button, Stack, Text, Code, List } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export function MfaSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState<string[] | null>(null);

  const refresh = async () => {
    const req = await api.post("/mfa/status");
    setStatus(req.data);
  };

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  if (!status) return null;

  return (
    <Stack>
      <Text fw={600}>{t("Two-factor authentication")}</Text>
      <Text size="sm" c="dimmed">
        {status.isEnabled ? t("MFA is enabled") : t("MFA is not enabled")}
      </Text>
      {!status.isEnabled && !setup && (
        <Button
          w="fit-content"
          onClick={async () => {
            const req = await api.post("/mfa/setup", { method: "totp" });
            setSetup(req.data);
          }}
        >
          {t("Set up MFA")}
        </Button>
      )}
      {setup && (
        <Stack>
          <Text size="sm">{t("Scan this key in your authenticator app")}</Text>
          <Code>{setup.manualKey}</Code>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <Button
            onClick={async () => {
              const req = await api.post("/mfa/enable", { verificationCode: code });
              setBackup(req.data.backupCodes);
              setSetup(null);
              await refresh();
            }}
          >
            {t("Enable")}
          </Button>
        </Stack>
      )}
      {backup && (
        <List>
          {backup.map((c) => (
            <List.Item key={c}>
              <Code>{c}</Code>
            </List.Item>
          ))}
        </List>
      )}
      {status.isEnabled && (
        <Button
          color="red"
          w="fit-content"
          onClick={async () => {
            await api.post("/mfa/disable", {});
            notifications.show({ message: t("MFA disabled") });
            await refresh();
          }}
        >
          {t("Disable MFA")}
        </Button>
      )}
    </Stack>
  );
}
