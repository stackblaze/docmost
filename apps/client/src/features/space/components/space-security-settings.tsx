import { Text, Divider, Title } from "@mantine/core";
import React from "react";
import { useTranslation } from "react-i18next";
import { ISpace } from "@/features/space/types/space.types.ts";
import {
  SpacePublicSharingToggle,
  SpaceViewerCommentsToggle,
} from "@/features/space/components/space-toggles";

type SpaceSecuritySettingsProps = {
  space: ISpace;
  readOnly?: boolean;
};

export default function SpaceSecuritySettings({
  space,
  readOnly,
}: SpaceSecuritySettingsProps) {
  const { t } = useTranslation();

  if (readOnly) return null;

  return (
    <div>
      <Title order={3} my="md" size="h6" fw={600}>
        {t("Security")}
      </Title>

      <SpacePublicSharingToggle space={space} />

      <Divider my="lg" />

      <SpaceViewerCommentsToggle space={space} />
    </div>
  );
}
