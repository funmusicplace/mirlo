import React from "react";
import { useDebouncedCallback } from "use-debounce";

import { safeLocalStorage } from "./safeLocalStorage";

interface UseBodyDraftResult {
  content: string;
  hasRestoredDraft: boolean;
  setContent: (html: string) => void;
  clearDraft: () => void;
  discardDraft: () => void;
  dismissBanner: () => void;
}

const readInitial = (key: string | null): string | null =>
  key ? safeLocalStorage.read(key) : null;

export function useBodyDraft(
  key: string | null,
  serverContent: string
): UseBodyDraftResult {
  const initialDraft = React.useMemo(() => readInitial(key), [key]);
  const [content, setContentState] = React.useState(
    initialDraft ?? serverContent
  );
  const [hasRestoredDraft, setHasRestoredDraft] = React.useState(
    initialDraft !== null && initialDraft !== serverContent
  );

  React.useEffect(() => {
    if (key && initialDraft !== null && initialDraft === serverContent) {
      safeLocalStorage.remove(key);
    }
  }, [key, initialDraft, serverContent]);

  const persistDraft = useDebouncedCallback((html: string) => {
    if (!key) return;
    safeLocalStorage.write(key, html);
  }, 500);

  React.useEffect(() => {
    return () => {
      persistDraft.flush();
    };
  }, [persistDraft]);

  const setContent = React.useCallback(
    (html: string) => {
      setContentState(html);
      persistDraft(html);
    },
    [persistDraft]
  );

  const clearDraft = React.useCallback(() => {
    if (!key) return;
    persistDraft.cancel();
    safeLocalStorage.remove(key);
    setHasRestoredDraft(false);
  }, [key, persistDraft]);

  const discardDraft = React.useCallback(() => {
    if (!key) return;
    persistDraft.cancel();
    safeLocalStorage.remove(key);
    setContentState(serverContent);
    setHasRestoredDraft(false);
  }, [key, persistDraft, serverContent]);

  const dismissBanner = React.useCallback(() => {
    setHasRestoredDraft(false);
  }, []);

  return {
    content,
    hasRestoredDraft,
    setContent,
    clearDraft,
    discardDraft,
    dismissBanner,
  };
}
