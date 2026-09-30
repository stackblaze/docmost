import { Container, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { MfaSettings } from "@/features/mfa/mfa-settings";

export default function MfaSetupRequiredPage() {
  const { t } = useTranslation();
  return (
    <Container size={520} mt="xl">
      <Title order={2} mb="md">
        {t("MFA setup required")}
      </Title>
      <MfaSettings />
    </Container>
  );
}
