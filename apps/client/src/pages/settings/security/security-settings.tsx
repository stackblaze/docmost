import { Button, Divider, Modal, NumberInput, Stack, Table, Text, TextInput, Select, Switch } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import { WorkspaceToggle } from "@/features/security/workspace-toggle";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import { updateWorkspace } from "@/features/workspace/services/workspace-service.ts";
import {
  createSsoProvider,
  deleteSsoProvider,
  getSsoProviders,
  updateSsoProvider,
} from "@/features/sso/sso-service";
import { IAuthProvider, SSO_PROVIDER } from "@/features/sso/types";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export default function SecuritySettings() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<IAuthProvider[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<any>({ type: SSO_PROVIDER.OIDC, name: "", allowSignup: false });

  const load = async () => {
    const data = await getSsoProviders();
    setProviders(data.items || (data as any));
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const save = async () => {
    try {
      await createSsoProvider(form);
      close();
      await load();
    } catch (err: any) {
      notifications.show({ message: err?.response?.data?.message, color: "red" });
    }
  };

  return (
    <>
      <DocumentTitle title="Security" />
      <SettingsTitle title={t("Security & SSO")} />
      <Stack gap="lg">
        <WorkspaceToggle
          title={t("Enforce SSO")}
          description={t("Members must sign in with SSO.")}
          field="enforceSso"
        />
        <WorkspaceToggle
          title={t("Enforce MFA")}
          description={t("Members must enroll a TOTP authenticator.")}
          field="enforceMfa"
        />
        <WorkspaceToggle
          title={t("Disable public sharing")}
          description={t("Prevent new public share links.")}
          field="disablePublicSharing"
        />
        <WorkspaceToggle
          title={t("Allow member templates")}
          description={t("Let members create workspace templates.")}
          field="allowMemberTemplates"
        />
        <WorkspaceToggle
          title={t("Personal spaces")}
          description={t("Give each member a personal space.")}
          field="allowPersonalSpaces"
        />
        <WorkspaceToggle
          title={t("Enable SCIM")}
          description={t("Allow identity providers to provision users.")}
          field="isScimEnabled"
        />
        <TrashRetention />
        <Divider />
        <Text fw={600}>{t("SSO providers")}</Text>
        <Button onClick={open} w="fit-content">
          {t("Add provider")}
        </Button>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("Name")}</Table.Th>
              <Table.Th>{t("Type")}</Table.Th>
              <Table.Th>{t("Enabled")}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(Array.isArray(providers) ? providers : []).map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>{p.name}</Table.Td>
                <Table.Td>{p.type}</Table.Td>
                <Table.Td>
                  <Switch
                    checked={p.isEnabled}
                    onChange={() =>
                      updateSsoProvider({ providerId: p.id, isEnabled: !p.isEnabled }).then(load)
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    color="red"
                    onClick={() => deleteSsoProvider(p.id).then(load)}
                  >
                    {t("Delete")}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <ScimTokens />
      </Stack>
      <Modal opened={opened} onClose={close} title={t("Add SSO provider")}>
        <Stack>
          <TextInput
            label={t("Name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <Select
            label={t("Type")}
            value={form.type}
            data={Object.values(SSO_PROVIDER)}
            onChange={(v) => setForm({ ...form, type: v })}
          />
          {form.type === SSO_PROVIDER.OIDC || form.type === SSO_PROVIDER.GOOGLE ? (
            <>
              <TextInput
                label="Issuer"
                value={form.oidcIssuer || ""}
                onChange={(e) => setForm({ ...form, oidcIssuer: e.currentTarget.value })}
              />
              <TextInput
                label="Client ID"
                value={form.oidcClientId || ""}
                onChange={(e) => setForm({ ...form, oidcClientId: e.currentTarget.value })}
              />
              <TextInput
                label="Client secret"
                value={form.oidcClientSecret || ""}
                onChange={(e) => setForm({ ...form, oidcClientSecret: e.currentTarget.value })}
              />
            </>
          ) : null}
          {form.type === SSO_PROVIDER.SAML ? (
            <>
              <TextInput
                label="SSO URL"
                value={form.samlUrl || ""}
                onChange={(e) => setForm({ ...form, samlUrl: e.currentTarget.value })}
              />
              <TextInput
                label="Certificate"
                value={form.samlCertificate || ""}
                onChange={(e) => setForm({ ...form, samlCertificate: e.currentTarget.value })}
              />
            </>
          ) : null}
          {form.type === SSO_PROVIDER.LDAP ? (
            <>
              <TextInput
                label="LDAP URL"
                value={form.ldapUrl || ""}
                onChange={(e) => setForm({ ...form, ldapUrl: e.currentTarget.value })}
              />
              <TextInput
                label="Base DN"
                value={form.ldapBaseDn || ""}
                onChange={(e) => setForm({ ...form, ldapBaseDn: e.currentTarget.value })}
              />
              <TextInput
                label="Bind DN"
                value={form.ldapBindDn || ""}
                onChange={(e) => setForm({ ...form, ldapBindDn: e.currentTarget.value })}
              />
              <TextInput
                label="Bind password"
                value={form.ldapBindPassword || ""}
                onChange={(e) => setForm({ ...form, ldapBindPassword: e.currentTarget.value })}
              />
            </>
          ) : null}
          <Button onClick={save}>{t("Create")}</Button>
        </Stack>
      </Modal>
    </>
  );
}

function ScimTokens() {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState("SCIM");
  const load = async () => {
    const req = await api.post("/scim-tokens");
    setTokens((req.data as any).items || req.data || []);
  };
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  return (
    <Stack>
      <Divider />
      <Text fw={600}>{t("SCIM tokens")}</Text>
      <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} label={t("Name")} />
      <Button
        w="fit-content"
        onClick={async () => {
          const created = await api.post("/scim-tokens/create", { name });
          notifications.show({
            title: t("Token created"),
            message: (created.data as any).token,
          });
          await load();
        }}
      >
        {t("Create token")}
      </Button>
      <Table>
        <Table.Tbody>
          {tokens.map((token) => (
            <Table.Tr key={token.id}>
              <Table.Td>{token.name}</Table.Td>
              <Table.Td>****{token.tokenLastFour}</Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() => api.post("/scim-tokens/revoke", { tokenId: token.id }).then(load)}
                >
                  {t("Revoke")}
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function TrashRetention() {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const [days, setDays] = useState(workspace?.trashRetentionDays ?? 30);

  return (
    <Stack>
      <Text fw={600}>{t("Trash retention")}</Text>
      <NumberInput
        label={t("Days")}
        value={days}
        min={1}
        max={3650}
        onChange={(v) => setDays(Number(v) || 30)}
      />
      <Button
        w="fit-content"
        onClick={async () => {
          const updated = await updateWorkspace({ trashRetentionDays: days } as any);
          setWorkspace(updated);
          notifications.show({ message: t("Saved") });
        }}
      >
        {t("Save retention")}
      </Button>
    </Stack>
  );
}
