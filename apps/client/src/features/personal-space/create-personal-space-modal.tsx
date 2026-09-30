import { Button, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCreatePersonalSpaceMutation } from "./personal-space-query";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";

export default function CreatePersonalSpaceModal({
  opened,
  onClose,
}: {
  opened?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePersonalSpaceMutation();
  const navigate = useNavigate();

  return (
    <Modal
      opened={Boolean(opened)}
      onClose={onClose ?? (() => undefined)}
      title={t("Create personal space")}
    >
      <Stack>
        <Text size="sm">
          {t("Create a private space that only you can access.")}
        </Text>
        <Button
          onClick={async () => {
            try {
              const space = await create.mutateAsync();
              onClose?.();
              if (space?.slug) {
                navigate(`/s/${space.slug}`);
              }
            } catch (err: any) {
              notifications.show({
                message: err?.response?.data?.message,
                color: "red",
              });
            }
          }}
          loading={create.isPending}
        >
          {t("Create")}
        </Button>
      </Stack>
    </Modal>
  );
}
