import { Button, Stack, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api-client";

export default function TemplateEditorPage() {
  const { templateId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    api
      .post("/templates/info", { templateId })
      .then((req) => setTemplate(req.data))
      .catch(() => undefined);
  }, [templateId]);

  if (!template) return null;

  return (
    <Stack p="xl">
      <TextInput
        label={t("Title")}
        value={template.title || ""}
        onChange={(e) => setTemplate({ ...template, title: e.currentTarget.value })}
      />
      <Textarea
        label={t("Description")}
        value={template.description || ""}
        onChange={(e) => setTemplate({ ...template, description: e.currentTarget.value })}
      />
      <Button
        onClick={async () => {
          await api.post("/templates/update", {
            templateId,
            title: template.title,
            description: template.description,
          });
          navigate("/templates");
        }}
      >
        {t("Save")}
      </Button>
    </Stack>
  );
}
