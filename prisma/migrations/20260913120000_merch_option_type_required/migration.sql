-- Lets an artist mark a merch option type (eg. "gift note") as optional, so a
-- buyer isn't forced to pick a value for it. See #1295.
--
-- Defaults to true so every existing option type keeps the behaviour it had
-- before this column existed: the buy form marked all of them `required`.
ALTER TABLE "MerchOptionType" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
