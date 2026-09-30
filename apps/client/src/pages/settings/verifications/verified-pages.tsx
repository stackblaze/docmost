import { Button, Stack, Table } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import api from "@/lib/api-client";

export default function VerifiedPagesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const req = await api.post("/verifications");
    setItems((req.data as any).items || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <>
      <DocumentTitle title="Verified pages" />
      <SettingsTitle title={t("Verified pages")} />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Page")}</Table.Th>
            <Table.Th>{t("Status")}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>{item.pageId}</Table.Td>
              <Table.Td>{item.status}</Table.Td>
              <Table.Td>
                <Stack>
                  <Button
                    size="xs"
                    onClick={() =>
                      api.post("/verifications/verify", { verificationId: item.id }).then(load)
                    }
                  >
                    {t("Verify")}
                  </Button>
                </Stack>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
