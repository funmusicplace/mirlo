import { FormSettings } from "components/Admin/settings/settingsForm";
import {
  cloneDeep,
  get,
  isEqual,
  isPlainObject,
  mapValues,
  omitBy,
  set,
} from "lodash";
import { Path } from "react-hook-form";

import { SAVED_STEP_KEYS, SavedStepKey, STEP_FIELDS } from "./guideSteps";

const isBlank = (value: unknown) =>
  value === undefined || value === null || value === "";

const withoutBlanks = (value: unknown): unknown =>
  isPlainObject(value)
    ? omitBy(
        mapValues(value as Record<string, unknown>, withoutBlanks),
        isBlank
      )
    : value;

const isSameValue = (a: unknown, b: unknown) =>
  (isBlank(a) && isBlank(b)) || isEqual(withoutBlanks(a), withoutBlanks(b));

export const withStepFields = (
  key: SavedStepKey,
  base: FormSettings,
  source: FormSettings
): FormSettings => {
  const result = cloneDeep(base);
  for (const field of STEP_FIELDS[key]) {
    set(result, field, get(source, field));
  }
  return result;
};

export const unsavedFields = (
  values: FormSettings,
  saved: FormSettings,
  except?: SavedStepKey
): Path<FormSettings>[] =>
  SAVED_STEP_KEYS.filter((key) => key !== except).flatMap((key) =>
    STEP_FIELDS[key].filter(
      (field) => !isSameValue(get(values, field), get(saved, field))
    )
  );
