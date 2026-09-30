import { ActionIcon, Button, Modal, Select, Stack, Table, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { extractPageSlugId } from "@/lib";
import { usePageQuery } from "@/features/page/queries/page-query";
import { IconShare } from "@tabler/icons-react";
import api from "@/lib/api-client";

export function PageShareModal({ readOnly }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const { pageSlug } = useParams();
  const pageSlugId = extractPageSlugId(pageSlug);
  const { data: page } = usePageQuery({ pageId: pageSlugId });
  const [opened, { open, close }] = useDisclosure(false);
  const pageId = page?.id;
  const [items, setItems] = useState<any[]>([]);
  const [restricted, setRestricted] = useState(false);

  const load = async () => {
    if (!pageId) return;
    const info = await api.post("/pages/permission-info", { pageId });
    setRestricted(Boolean((info.data as any).hasDirectRestriction));
    const perms = await api.post("/pages/permissions", { pageId });
    setItems((perms.data as any).items || []);
  };

  useEffect(() => {
    if (opened) load().catch(() => undefined);
  }, [opened, pageId]);

  return (
    <>
      <Tooltip label={t("Share")} openDelay={250} withArrow>
        <ActionIcon variant="subtle" color="dark" onClick={open} aria-label={t("Share")}>
          <IconShare size={20} stroke={2} />
        </ActionIcon>
      </Tooltip>
      <Modal opened={opened} onClose={close} title={t("Share")}>
        <Stack>
          {!readOnly && (
            <Button
              onClick={async () => {
                if (!pageId) return;
                if (restricted) {
                  await api.post("/pages/remove-restriction", { pageId });
                } else {
                  await api.post("/pages/restrict", { pageId });
                }
                await load();
              }}
            >
              {restricted ? t("Remove restriction") : t("Restrict page")}
            </Button>
          )}
          <Table>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.name}</Table.Td>
                  <Table.Td>{item.role}</Table.Td>
                  <Table.Td>
                    {!readOnly && (
                      <Select
                        value={item.role}
                        data={["reader", "writer"]}
                        onChange={(role) =>
                          api
                            .post("/pages/update-permission", {
                              pageId,
                              userId: item.type === "user" ? item.id : undefined,
                              groupId: item.type === "group" ? item.id : undefined,
                              role,
                            })
                            .then(load)
                        }
                      />
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>
    </>
  );
}

export { PageShareModal as PagePermissionModal };
