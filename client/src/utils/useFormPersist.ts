import { isEqual } from "lodash";
import React from "react";
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";

import { safeLocalStorage } from "./safeLocalStorage";

interface UseFormPersistResult {
  hasRestoredDraft: boolean;
  restoredFields: string[];
  clearDraft: () => void;
  discardDraft: (serverValues: FieldValues) => void;
  dismissBanner: () => void;
}

export function useFormPersist<T extends FieldValues>(
  key: string | null,
  methods: UseFormReturn<T>
): UseFormPersistResult {
  const [restoredFields, setRestoredFields] = React.useState<string[]>([]);
  const hasRestoredOnce = React.useRef(false);

  React.useEffect(() => {
    if (!key || hasRestoredOnce.current) return;
    const raw = safeLocalStorage.read(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const changed: string[] = [];
      Object.entries(parsed).forEach(([fieldName, value]) => {
        const currentValue = methods.getValues(fieldName as Path<T>);
        if (!isEqual(currentValue, value)) {
          changed.push(fieldName);
          methods.setValue(
            fieldName as Path<T>,
            value as PathValue<T, Path<T>>,
            { shouldDirty: true }
          );
        }
      });
      hasRestoredOnce.current = true;
      if (changed.length > 0) {
        setRestoredFields(changed);
      } else {
        safeLocalStorage.remove(key);
      }
    } catch {}
  }, [key, methods]);

  const persistDraft = useDebouncedCallback((values: T) => {
    if (!key) return;
    safeLocalStorage.write(key, JSON.stringify(values));
  }, 500);

  React.useEffect(() => {
    if (!key) return;
    const subscription = methods.watch((values) => {
      if (!methods.formState.isDirty) return;
      persistDraft(values as T);
    });
    return () => {
      subscription.unsubscribe();
      persistDraft.flush();
    };
  }, [key, methods, persistDraft]);

  const clearDraft = React.useCallback(() => {
    if (!key) return;
    persistDraft.cancel();
    safeLocalStorage.remove(key);
    setRestoredFields([]);
  }, [key, persistDraft]);

  const discardDraft = React.useCallback(
    (serverValues: FieldValues) => {
      if (!key) return;
      persistDraft.cancel();
      safeLocalStorage.remove(key);
      methods.reset(serverValues as T);
      setRestoredFields([]);
    },
    [key, methods, persistDraft]
  );

  const dismissBanner = React.useCallback(() => {
    setRestoredFields([]);
  }, []);

  return {
    hasRestoredDraft: restoredFields.length > 0,
    restoredFields,
    clearDraft,
    discardDraft,
    dismissBanner,
  };
}
