import { Button, PasswordInput, Stack, Switch, Tabs, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import { WorkspaceToggle } from "@/features/security/workspace-toggle";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export default function AiSettingsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.endsWith("/mcp") ? "mcp" : "ai";
  const [settings, setSettings] = useState<any>({});
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    api
      .post("/ai/settings")
      .then((req) => setSettings(req.data))
      .catch(() => undefined);
  }, []);

  const save = async () => {
    const req = await api.post("/ai/settings/update", { ...settings, apiKey: apiKey || undefined });
    setSettings(req.data);
    notifications.show({ message: t("Saved") });
  };

  return (
    <>
      <DocumentTitle title="AI settings" />
      <SettingsTitle title={t("AI settings")} />
      <Tabs value={tab} onChange={(v) => navigate(v === "mcp" ? "/settings/ai/mcp" : "/settings/ai")}>
        <Tabs.List>
          <Tabs.Tab value="ai">{t("AI")}</Tabs.Tab>
          <Tabs.Tab value="mcp">{t("MCP")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="ai" pt="md">
          <Stack>
            <TextInput
              label={t("Provider")}
              value={settings.provider || "openai"}
              onChange={(e) => setSettings({ ...settings, provider: e.currentTarget.value })}
            />
            <TextInput
              label={t("Model")}
              value={settings.model || ""}
              onChange={(e) => setSettings({ ...settings, model: e.currentTarget.value })}
            />
            <TextInput
              label={t("Base URL")}
              value={settings.baseUrl || ""}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.currentTarget.value })}
            />
            <PasswordInput
              label={t("API key")}
              value={apiKey}
              onChange={(e) => setApiKey(e.currentTarget.value)}
            />
            <WorkspaceToggle
              title={t("Read-only chat")}
              description={t("Prevent AI from editing pages.")}
              field="aiChatReadOnly"
            />
            <WorkspaceToggle
              title={t("Workspace knowledge only")}
              description={t("Ground answers in workspace pages.")}
              field="aiChatWorkspaceKnowledgeOnly"
            />
            <Button w="fit-content" onClick={save}>
              {t("Save")}
            </Button>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="mcp" pt="md">
          <Stack>
            <WorkspaceToggle
              title={t("Enable MCP")}
              description={t("Allow MCP clients to connect.")}
              field="mcpEnabled"
            />
            <WorkspaceToggle
              title={t("Enforce MCP OAuth")}
              description={t("MCP clients must use an OAuth grant.")}
              field="enforceMcpOauth"
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
