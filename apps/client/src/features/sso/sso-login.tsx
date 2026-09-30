import { Button, Stack, TextInput, PasswordInput, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspacePublicDataQuery } from "@/features/workspace/queries/workspace-query";
import { IAuthProvider, SSO_PROVIDER } from "./types";
import { ldapLogin } from "./sso-service";
import { notifications } from "@mantine/notifications";
import { getPostLoginRedirect } from "@/lib/app-route";
import { useNavigate } from "react-router-dom";

export default function SsoLogin() {
  const { t } = useTranslation();
  const { data } = useWorkspacePublicDataQuery();
  const providers: IAuthProvider[] = (data as any)?.authProviders ?? [];
  const [ldap, setLdap] = useState<IAuthProvider | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  if (!providers.length) {
    return null;
  }

  const start = (provider: IAuthProvider) => {
    if (provider.type === SSO_PROVIDER.LDAP) {
      setLdap(provider);
      open();
      return;
    }
    window.location.href = `/api/sso/redirect/${provider.id}`;
  };

  const submitLdap = async () => {
    if (!ldap) return;
    try {
      await ldapLogin({ providerId: ldap.id, username, password });
      navigate(getPostLoginRedirect());
    } catch (err: any) {
      notifications.show({
        message: err?.response?.data?.message || t("LDAP login failed"),
        color: "red",
      });
    }
  };

  return (
    <>
      <Stack gap="xs" mb="md">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="default"
            fullWidth
            onClick={() => start(provider)}
          >
            {t("Continue with")} {provider.name}
          </Button>
        ))}
      </Stack>
      <Modal opened={opened} onClose={close} title={ldap?.name}>
        <Stack>
          <TextInput
            label={t("Username")}
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
          />
          <PasswordInput
            label={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Button onClick={submitLdap}>{t("Login")}</Button>
        </Stack>
      </Modal>
    </>
  );
}
