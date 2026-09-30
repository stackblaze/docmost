import { Group, Switch, Text } from "@mantine/core";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import { useState } from "react";
import { updateWorkspace } from "@/features/workspace/services/workspace-service.ts";
import { notifications } from "@mantine/notifications";

export function WorkspaceToggle({
  title,
  description,
  field,
}: {
  title: string;
  description: string;
  field: string;
}) {
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const [checked, setChecked] = useState(Boolean((workspace as any)?.[field]));

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.checked;
    try {
      const updated = await updateWorkspace({ [field]: value } as any);
      setChecked(value);
      setWorkspace(updated);
    } catch (err: any) {
      notifications.show({
        message: err?.response?.data?.message,
        color: "red",
      });
    }
  };

  return (
    <Group justify="space-between" wrap="nowrap" gap="xl">
      <div>
        <Text size="md">{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </div>
      <Switch checked={checked} onChange={handleChange} />
    </Group>
  );
}
