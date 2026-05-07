import React from "react";
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";

interface UseFormPersistResult {
  hasRestoredDraft: boolean;
  clearDraft: () => void;
  discardDraft: (serverValues: FieldValues) => void;
  dismissBanner: () => void;
}

export function useFormPersist<T extends FieldValues>(
  key: string | null,
  methods: UseFormReturn<T>
): UseFormPersistResult {
  const [hasRestoredDraft, setHasRestoredDraft] = React.useState(false);
  const hasRestoredOnce = React.useRef(false);

  React.useEffect(() => {
    if (!key || hasRestoredOnce.current) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      let anyDifferent = false;
      Object.entries(parsed).forEach(([fieldName, value]) => {
        const currentValue = methods.getValues(fieldName as Path<T>);
        if (!Object.is(currentValue, value)) {
          anyDifferent = true;
        }
        methods.setValue(fieldName as Path<T>, value as PathValue<T, Path<T>>, {
          shouldDirty: true,
        });
      });
      hasRestoredOnce.current = true;
      if (anyDifferent) {
        setHasRestoredDraft(true);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }, [key, methods]);

  const persistDraft = useDebouncedCallback((values: T) => {
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(values));
    } catch {}
  }, 500);

  React.useEffect(() => {
    if (!key) return;
    const subscription = methods.watch((values) => {
      persistDraft(values as T);
    });
    return () => {
      subscription.unsubscribe();
      persistDraft.cancel();
    };
  }, [key, methods, persistDraft]);

  const clearDraft = React.useCallback(() => {
    if (!key) return;
    persistDraft.cancel();
    try {
      window.localStorage.removeItem(key);
    } catch {}
    setHasRestoredDraft(false);
  }, [key, persistDraft]);

  const discardDraft = React.useCallback(
    (serverValues: FieldValues) => {
      if (!key) return;
      persistDraft.cancel();
      try {
        window.localStorage.removeItem(key);
      } catch {}
      methods.reset(serverValues as T);
      setHasRestoredDraft(false);
    },
    [key, methods, persistDraft]
  );

  const dismissBanner = React.useCallback(() => {
    setHasRestoredDraft(false);
  }, []);

  return { hasRestoredDraft, clearDraft, discardDraft, dismissBanner };
}
