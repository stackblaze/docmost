import { Button, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api-client";

export default function AiChatPage() {
  const { chatId } = useParams();
  const [chat, setChat] = useState<any>(null);
  const [content, setContent] = useState("");

  const load = async (id: string) => {
    const req = await api.post("/ai/chats/info", { chatId: id });
    setChat(req.data);
  };

  useEffect(() => {
    if (chatId) {
      load(chatId).catch(() => undefined);
    }
  }, [chatId]);

  return (
    <Stack p="xl">
      <Text fw={600}>AI chat</Text>
      {(chat?.messages || []).map((m: any) => (
        <Text key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </Text>
      ))}
      <TextInput value={content} onChange={(e) => setContent(e.currentTarget.value)} />
      <Button
        onClick={async () => {
          const req = await api.post("/ai/chat", { chatId, content });
          setContent("");
          await load((req.data as any).chatId);
        }}
      >
        Send
      </Button>
    </Stack>
  );
}
