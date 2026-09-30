import { Button, Group, TextInput } from "@mantine/core";
import { useState } from "react";
import type { ChatAttachment, PageMention } from "./ai-chat.types";

export default function ChatInput({
  onSubmit,
  onSend,
  onStop,
  isStreaming,
  placeholder,
  autofocus,
}: {
  onSubmit?: (content: string) => void;
  onSend?: (
    content: string,
    mentions: PageMention[],
    attachments: ChatAttachment[],
  ) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  autofocus?: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (onSend) {
      onSend(value, [], []);
    } else {
      onSubmit?.(value);
    }
    setValue("");
  };

  return (
    <Group>
      <TextInput
        style={{ flex: 1 }}
        value={value}
        placeholder={placeholder}
        autoFocus={autofocus}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      {isStreaming ? (
        <Button onClick={onStop}>Stop</Button>
      ) : (
        <Button onClick={submit}>Send</Button>
      )}
    </Group>
  );
}
