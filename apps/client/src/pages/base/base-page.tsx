import { useParams } from "react-router-dom";
import { BaseView } from "@/features/base/base-view";

export default function BasePage() {
  const { pageId } = useParams();
  if (!pageId) return null;
  return (
    <div style={{ padding: 24 }}>
      <BaseView pageId={pageId} />
    </div>
  );
}
