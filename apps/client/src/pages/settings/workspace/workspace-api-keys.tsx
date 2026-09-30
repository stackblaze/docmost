import ApiKeysPage from "@/pages/settings/account/api-keys-page";
import { WorkspaceToggle } from "@/features/security/workspace-toggle";
import { useTranslation } from "react-i18next";
import { Button, Stack, Table, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export default function WorkspaceApiKeys() {
  const { t } = useTranslation();
  return (
    <Stack>
      <WorkspaceToggle
        title={t("Restrict API keys to admins")}
        description={t("Only admins can create API keys.")}
        field="restrictApiToAdmins"
      />
      <ApiKeysPage adminView />
      <OAuthClients />
    </Stack>
  );
}

function OAuthClients() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("MCP app");
  const [redirect, setRedirect] = useState("http://localhost:3000/callback");

  const load = async () => {
    const req = await api.post("/oauth/clients");
    setItems((req.data as any) || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <Stack>
      <Text fw={600}>{t("OAuth apps")}</Text>
      <TextInput label={t("Name")} value={name} onChange={(e) => setName(e.currentTarget.value)} />
      <TextInput
        label={t("Redirect URI")}
        value={redirect}
        onChange={(e) => setRedirect(e.currentTarget.value)}
      />
      <Button
        w="fit-content"
        onClick={async () => {
          const created = await api.post("/oauth/clients/create", {
            name,
            redirectUris: [redirect],
            scopes: ["read"],
          });
          notifications.show({
            title: t("Client created"),
            message: (created.data as any).clientSecret,
          });
          await load();
        }}
      >
        {t("Create OAuth app")}
      </Button>
      <Table>
        <Table.Tbody>
          {items.map((client) => (
            <Table.Tr key={client.id}>
              <Table.Td>{client.name}</Table.Td>
              <Table.Td>{client.id}</Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    api.post("/oauth/clients/delete", { clientId: client.id }).then(load)
                  }
                >
                  {t("Delete")}
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
