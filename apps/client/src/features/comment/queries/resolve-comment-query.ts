import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveComment } from "@/features/comment/services/comment-service";
import { IResolveComment } from "@/features/comment/types/comment.types";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { RQ_KEY } from "@/features/comment/queries/comment-query";

export function useResolveCommentMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: IResolveComment) => resolveComment(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: RQ_KEY(variables.pageId) });
      notifications.show({
        message: variables.resolved
          ? t("Comment resolved successfully")
          : t("Comment re-opened successfully"),
      });
    },
    onError: () => {
      notifications.show({
        message: t("Failed to resolve comment"),
        color: "red",
      });
    },
  });
}
