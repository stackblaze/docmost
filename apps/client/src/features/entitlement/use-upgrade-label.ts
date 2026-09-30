import { useTranslation } from "react-i18next";

export function useUpgradeLabel(): string {
  const { t } = useTranslation();
  return t("Available in this edition");
}
