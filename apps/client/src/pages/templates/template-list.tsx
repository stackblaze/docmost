import { Button, SimpleGrid, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "@/lib/api-client";

export default function TemplateListPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("New template");

  const load = async () => {
    const req = await api.post("/templates");
    setItems((req.data as any).items || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Text fw={600} mb="md">
        {t("Templates")}
      </Text>
      <TextInput value={title} onChange={(e) => setTitle(e.currentTarget.value)} mb="sm" />
      <Button
        mb="lg"
        onClick={async () => {
          await api.post("/templates/create", { title });
          await load();
        }}
      >
        {t("Create template")}
      </Button>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {items.map((item) => (
          <Link key={item.id} to={`/templates/${item.id}`}>
            <div style={{ border: "1px solid var(--mantine-color-default-border)", padding: 16 }}>
              <Text fw={500}>{item.title}</Text>
              <Text size="sm" c="dimmed">
                {item.description}
              </Text>
            </div>
          </Link>
        ))}
      </SimpleGrid>
    </div>
  );
}
