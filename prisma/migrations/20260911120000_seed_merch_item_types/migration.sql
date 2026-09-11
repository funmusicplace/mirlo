-- Populate MerchItemType with the merch formats from #1852.
--
-- The table and Merch.itemTypeId have existed since the merch tables were
-- added (20240909214408), but nothing has ever written to or read from them.
-- This gives the dropdown something to offer. Idempotent so it's safe to
-- re-run against a database where someone has already added rows.
INSERT INTO "MerchItemType" ("name")
SELECT name
FROM (
  VALUES
    ('Cassette'),
    ('CD'),
    ('12" Vinyl'),
    ('7" Vinyl'),
    ('Printed goods'),
    ('Zine'),
    ('Sticker'),
    ('Other')
) AS seed(name)
WHERE NOT EXISTS (
  SELECT 1 FROM "MerchItemType" existing WHERE existing."name" = seed.name
);
