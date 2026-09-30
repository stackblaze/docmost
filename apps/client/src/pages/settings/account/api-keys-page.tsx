import { Button, Stack, Table, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export default function ApiKeysPage({ adminView = false }: { adminView?: boolean }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("API key");

  const load = async () => {
    const req = await api.post("/api-keys", { adminView });
    setItems((req.data as any).items || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [adminView]);

  return (
    <>
      <DocumentTitle title="API keys" />
      <SettingsTitle title={adminView ? t("API management") : t("API keys")} />
      <Stack>
        <TextInput value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Button
          w="fit-content"
          onClick={async () => {
            const created = await api.post("/api-keys/create", { name });
            notifications.show({
              title: t("API key created"),
              message: (created.data as any).token,
            });
            await load();
          }}
        >
          {t("Create")}
        </Button>
        <Table>
          <Table.Tbody>
            {items.map((key) => (
              <Table.Tr key={key.id}>
                <Table.Td>{key.name}</Table.Td>
                <Table.Td>{key.createdAt}</Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    color="red"
                    onClick={() => api.post("/api-keys/revoke", { apiKeyId: key.id }).then(load)}
                  >
                    {t("Revoke")}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </>
  );
}
