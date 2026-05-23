-- Now that suggested price is always visible, trackgroups without one set
-- display a 0 in the manage UI even when minimum price is nonzero. This
-- migration finds where suggested price is null and sets it to minimum price.
-- This matches the behavior in the purchase flow: the minimum price is
-- displayed in the amount field unless suggested price is greater.
UPDATE "TrackGroup"
SET "suggestedPrice" = "minPrice"
WHERE "minPrice" IS NOT NULL
	AND "suggestedPrice" IS NULL;
