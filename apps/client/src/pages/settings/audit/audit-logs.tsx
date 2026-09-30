import { Button, Stack, Table, Tabs, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.endsWith("/siem") ? "siem" : "logs";
  const [logs, setLogs] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [name, setName] = useState("Webhook");
  const [url, setUrl] = useState("");

  useEffect(() => {
    api
      .post("/audit")
      .then((req) => setLogs((req.data as any).items || []))
      .catch(() => undefined);
    api
      .post("/siem/destinations")
      .then((req) => setDestinations((req.data as any) || []))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <DocumentTitle title="Audit logs" />
      <SettingsTitle title={t("Audit logs & SIEM")} />
      <Tabs value={tab} onChange={(v) => navigate(v === "siem" ? "/settings/audit/siem" : "/settings/audit")}>
        <Tabs.List>
          <Tabs.Tab value="logs">{t("Logs")}</Tabs.Tab>
          <Tabs.Tab value="siem">{t("SIEM")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="logs" pt="md">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("Event")}</Table.Th>
                <Table.Th>{t("Resource")}</Table.Th>
                <Table.Th>{t("When")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{log.event}</Table.Td>
                  <Table.Td>{log.resourceType}</Table.Td>
                  <Table.Td>{log.createdAt}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
        <Tabs.Panel value="siem" pt="md">
          <Stack>
            <TextInput label={t("Name")} value={name} onChange={(e) => setName(e.currentTarget.value)} />
            <TextInput label="URL" value={url} onChange={(e) => setUrl(e.currentTarget.value)} />
            <Button
              w="fit-content"
              onClick={async () => {
                await api.post("/siem/destinations/create", {
                  name,
                  type: "webhook",
                  config: { url },
                });
                const req = await api.post("/siem/destinations");
                setDestinations(req.data as any);
              }}
            >
              {t("Add destination")}
            </Button>
            <Table>
              <Table.Tbody>
                {destinations.map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>{d.name}</Table.Td>
                    <Table.Td>{d.status}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="subtle"
                        onClick={() =>
                          api.post("/siem/destinations/test", { destinationId: d.id }).then((r) =>
                            notifications.show({ message: JSON.stringify(r.data) }),
                          )
                        }
                      >
                        {t("Test")}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
