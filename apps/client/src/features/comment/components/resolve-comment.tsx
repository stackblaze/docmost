import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconRestore } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { resolveComment } from "@/features/comment/services/comment-service";
import { IComment } from "@/features/comment/types/comment.types";
import { notifications } from "@mantine/notifications";

export default function ResolveComment({
  comment,
  editor,
  commentId,
  pageId,
  resolvedAt,
}: {
  comment?: IComment;
  editor?: any;
  commentId?: string;
  pageId?: string;
  resolvedAt?: Date | string | null;
}) {
  const { t } = useTranslation();
  const id = comment?.id ?? commentId;
  const page = comment?.pageId ?? pageId;
  const resolved = Boolean(comment?.resolvedAt ?? resolvedAt);

  return (
    <Tooltip label={resolved ? t("Re-open") : t("Resolve")}>
      <ActionIcon
        variant="subtle"
        onClick={async () => {
          if (!id || !page) return;
          try {
            await resolveComment({
              commentId: id,
              pageId: page,
              resolved: !resolved,
            });
            if (editor?.commands?.setCommentResolved) {
              editor.commands.setCommentResolved(id, !resolved);
            }
          } catch (err: any) {
            notifications.show({
              message: err?.response?.data?.message,
              color: "red",
            });
          }
        }}
      >
        {resolved ? <IconRestore size={16} /> : <IconCheck size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
