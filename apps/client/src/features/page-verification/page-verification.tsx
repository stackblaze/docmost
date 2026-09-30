import { Button, Menu, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import api from "@/lib/api-client";
import { notifications } from "@mantine/notifications";

export function PageVerificationMenuItem({
  pageId,
  onClick,
}: {
  pageId?: string;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Menu.Item
        onClick={() => {
          onClick?.();
          open();
        }}
      >
        {t("Verification")}
      </Menu.Item>
      {pageId && (
        <PageVerificationModal pageId={pageId} opened={opened} onClose={close} />
      )}
    </>
  );
}

export function PageVerificationModal({
  pageId,
  opened,
  onClose,
}: {
  pageId: string;
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal opened={opened} onClose={onClose} title={t("Page verification")}>
      <Stack>
        <Button
          onClick={async () => {
            await api.post("/verifications/setup", { pageId });
            notifications.show({ message: t("Verification requested") });
            onClose();
          }}
        >
          {t("Request verification")}
        </Button>
      </Stack>
    </Modal>
  );
}
