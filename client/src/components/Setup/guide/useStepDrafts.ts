import { FormSettings } from "components/Admin/settings/settingsForm";
import { get } from "lodash";
import React from "react";
import { UseFormReturn } from "react-hook-form";

import { SavedStepKey } from "./guideSteps";
import { unsavedFields, withStepFields } from "./stepDrafts";

export const useStepDrafts = (
  methods: UseFormReturn<FormSettings>,
  saveSettings: (data: FormSettings) => Promise<void>
) => {
  const savedValues = React.useCallback(
    () => (methods.formState.defaultValues ?? {}) as FormSettings,
    [methods]
  );

  const saveStep = React.useCallback(
    async (key: SavedStepKey) => {
      const values = methods.getValues();
      const drafts = unsavedFields(values, savedValues(), key);
      await saveSettings(withStepFields(key, savedValues(), values));
      for (const field of drafts) {
        methods.setValue(field, get(values, field), { shouldDirty: true });
      }
    },
    [methods, saveSettings, savedValues]
  );

  const discardStep = React.useCallback(
    (key: SavedStepKey) => {
      methods.reset(withStepFields(key, methods.getValues(), savedValues()), {
        keepDefaultValues: true,
      });
    },
    [methods, savedValues]
  );

  const hasUnsavedChanges = React.useCallback(
    () => unsavedFields(methods.getValues(), savedValues()).length > 0,
    [methods, savedValues]
  );

  return { saveStep, discardStep, hasUnsavedChanges };
};

export default useStepDrafts;
