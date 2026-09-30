import SettingsTitle from "@/components/settings/settings-title.tsx";
import WorkspaceNameForm from "@/features/workspace/components/settings/components/workspace-name-form";
import WorkspaceIcon from "@/features/workspace/components/settings/components/workspace-icon.tsx";
import { useTranslation } from "react-i18next";
import { isBetaPublicSpaces, isCloud } from "@/lib/config.ts";
import ManageHostname from "@/ee/components/manage-hostname.tsx";
import { Divider } from "@mantine/core";
import { WorkspaceToggle } from "@/features/security/workspace-toggle";
import WorkspaceDefaultPageEditMode from "@/features/workspace/components/settings/components/workspace-default-page-edit-mode.tsx";
import AllowPublicSpaces from "@/features/workspace/components/settings/components/allow-public-spaces.tsx";
import { DocumentTitle } from "@/components/ui/document-title.tsx";

export default function WorkspaceSettings() {
  const { t } = useTranslation();
  return (
    <>
      <DocumentTitle title="Workspace Settings" />
      <SettingsTitle title={t("General")} />
      <WorkspaceIcon />
      <WorkspaceNameForm />

      <Divider my="md" />
      <WorkspaceToggle
        title={t("Allow member templates")}
        description={t("Let members create workspace templates.")}
        field="allowMemberTemplates"
      />

      <Divider my="md" />
      <WorkspaceToggle
        title={t("Personal spaces")}
        description={t("Give each member a personal space.")}
        field="allowPersonalSpaces"
      />

      {isBetaPublicSpaces() && (
        <>
          <Divider my="md" />
          <AllowPublicSpaces />
        </>
      )}

      {isCloud() && (
        <>
          <Divider my="md" />
          <ManageHostname />
        </>
      )}

      <Divider my="md" />
      <WorkspaceDefaultPageEditMode />
    </>
  );
}
