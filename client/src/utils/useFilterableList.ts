import { useMemo, useState } from "react";

export function useFilterableList<T>(
  items: T[],
  getSearchableText: (item: T) => string
) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      getSearchableText(item).toLowerCase().includes(q)
    );
  }, [items, searchQuery, getSearchableText]);
  return { searchQuery, setSearchQuery, filtered };
}
