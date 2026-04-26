-- Rename artist color keys in Artist.properties.colors to use semantically
-- accurate names. The old names ("primary", "secondary", "foreground") were
-- misleading: "primary" was actually used for buttons and links, "secondary"
-- for text on filled buttons, "foreground" for body text. The new names match
-- what the values are actually used for.
--
-- "background" is unchanged (the only legacy name that was accurate).
--
-- This is a JSON key rename only: values are moved 1:1. Code that reads
-- `colors.primary` etc. is updated in the same change so behaviour is
-- identical for end users.

UPDATE "Artist"
SET properties = jsonb_set(
  properties,
  '{colors}',
  (
    (properties -> 'colors')
      - 'primary' - 'secondary' - 'foreground'
      || jsonb_strip_nulls(jsonb_build_object(
        'button',     properties -> 'colors' -> 'primary',
        'buttonText', properties -> 'colors' -> 'secondary',
        'text',       properties -> 'colors' -> 'foreground'
      ))
  )
)
WHERE properties -> 'colors' IS NOT NULL
  AND jsonb_typeof(properties -> 'colors') = 'object'
  AND (
       (properties -> 'colors' ? 'primary')
    OR (properties -> 'colors' ? 'secondary')
    OR (properties -> 'colors' ? 'foreground')
  );

-- Same rename for the instance customization stored in Settings.
-- The settings table has a single row with a `settings` JSON column; the
-- relevant path is `settings.instanceCustomization.colors`.

UPDATE "Settings"
SET settings = jsonb_set(
  settings,
  '{instanceCustomization,colors}',
  (
    (settings -> 'instanceCustomization' -> 'colors')
      - 'primary' - 'secondary' - 'foreground'
      || jsonb_strip_nulls(jsonb_build_object(
        'button',     settings -> 'instanceCustomization' -> 'colors' -> 'primary',
        'buttonText', settings -> 'instanceCustomization' -> 'colors' -> 'secondary',
        'text',       settings -> 'instanceCustomization' -> 'colors' -> 'foreground'
      ))
  )
)
WHERE settings -> 'instanceCustomization' -> 'colors' IS NOT NULL
  AND jsonb_typeof(settings -> 'instanceCustomization' -> 'colors') = 'object'
  AND (
       (settings -> 'instanceCustomization' -> 'colors' ? 'primary')
    OR (settings -> 'instanceCustomization' -> 'colors' ? 'secondary')
    OR (settings -> 'instanceCustomization' -> 'colors' ? 'foreground')
  );
