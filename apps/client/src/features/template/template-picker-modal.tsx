import { Modal } from "@mantine/core";
import TemplateListPage from "@/pages/templates/template-list";

export default function TemplatePickerModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="Templates">
      <TemplateListPage />
    </Modal>
  );
}
