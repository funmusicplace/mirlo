-- Descriptions were plain text from a textarea; they're rich text now.
-- Escape them, turn blank lines into paragraphs and single line breaks into <br>.
UPDATE "Fundraiser"
SET "description" = '<p>' || regexp_replace(
  regexp_replace(
    replace(replace(replace(btrim("description", E' \t\r\n'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
    E'\\r?\\n[ \\t]*(\\r?\\n[ \\t]*)+',
    '</p><p>',
    'g'
  ),
  E'\\r?\\n',
  '<br>',
  'g'
) || '</p>'
WHERE "description" IS NOT NULL
  AND btrim("description", E' \t\r\n') <> '';
