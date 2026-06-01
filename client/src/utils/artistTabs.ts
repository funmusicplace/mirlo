export type TabId = "roster" | "releases" | "posts" | "support" | "merch";

export interface TabConfig {
  id: TabId;
  label: string;
  visible: boolean;
  to: string;
  onClick?: () => void;
  navLinkId?: string;
}

export function sortTabsByOrder(
  tabs: TabConfig[],
  tabOrder: TabId[] | undefined
): TabConfig[] {
  if (!tabOrder) return tabs;
  return [...tabs].sort((a, b) => {
    const aPos = tabOrder.indexOf(a.id);
    const bPos = tabOrder.indexOf(b.id);
    return (
      (aPos === -1 ? tabs.length : aPos) - (bPos === -1 ? tabs.length : bPos)
    );
  });
}
