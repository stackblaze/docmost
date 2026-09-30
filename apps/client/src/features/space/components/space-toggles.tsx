import { Switch, Text, Group } from "@mantine/core";
import { ISpace } from "@/features/space/types/space.types";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import api from "@/lib/api-client";

function SpaceFlag({
  space,
  field,
  title,
}: {
  space: ISpace;
  field: string;
  title: string;
}) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(Boolean((space as any)[field]));
  return (
    <Group justify="space-between" wrap="nowrap" gap="xl">
      <Text size="md">{title}</Text>
      <Switch
        checked={checked}
        onChange={async (e) => {
          const value = e.currentTarget.checked;
          try {
            await api.post("/spaces/update", { spaceId: space.id, [field]: value });
            setChecked(value);
          } catch (err: any) {
            notifications.show({
              message: err?.response?.data?.message,
              color: "red",
            });
          }
        }}
        aria-label={t(title)}
      />
    </Group>
  );
}

export function SpacePublicSharingToggle({ space }: { space: ISpace }) {
  const { t } = useTranslation();
  return (
    <SpaceFlag
      space={space}
      field="disablePublicSharing"
      title={t("Disable public sharing")}
    />
  );
}

export function SpaceViewerCommentsToggle({ space }: { space: ISpace }) {
  const { t } = useTranslation();
  return (
    <SpaceFlag
      space={space}
      field="allowViewerComments"
      title={t("Allow viewer comments")}
    />
  );
}
