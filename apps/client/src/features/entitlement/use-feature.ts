import { useAtom } from "jotai";
import { entitlementAtom } from "./entitlement-atom";

export const useHasFeature = (feature: string): boolean => {
  const [entitlements] = useAtom(entitlementAtom);
  return entitlements?.features?.includes(feature) ?? false;
};
