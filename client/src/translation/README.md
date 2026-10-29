We use [transifex](https://app.transifex.com/) as our host for translations. It has some limitations because we're using the free tier but we're using that because it means translators don't have to edit json files (or we have to edit json files with passed on translations).

Then in React we use [react-i18next](https://github.com/i18next/react-i18next) for handling translation, and in most cases that means using the translation hook `const { t } = useTranslation(...)` that gives us the `t` function, to which you pass a key like `t('signup.Login)`. Locally those values are stored in `/client/src/translation/en.json`.

Then once the `en.json` file is updated with the new strings we'll need to send it to transifex.

## Other languages are bundled too

The other `<locale>.json` files in this folder are pulled from Transifex by `scripts/pull-translations.ts`. `.github/workflows/transifex-pull.yml` runs it every week and opens a PR with the changes. Don't edit these files by hand, because the next pull overwrites them. Make changes in Transifex.

They ship with the client, so a build without `VITE_TRANSIFEX_TOKEN` (for example a self-hosted instance) still has every language. When a token is set, `client/src/i18n.ts` also fetches from Transifex at runtime and puts those newer strings on top of the bundled ones.

To pull them by hand: `TRANSIFEX_TOKEN=<native project token> yarn ts-node scripts/pull-translations.ts`

To upload translations for a locale from a flat JSON file (dotted keys, the same shape as the pulled files): `TRANSIFEX_API_TOKEN=<REST API token> yarn ts-node scripts/upload-translations.ts <locale> <file.json>`. It's a dry run unless you pass `--apply`. Strings that are already translated in Transifex, or whose English has changed since the file was drafted, are skipped.

## Emails

The email templates in `/emails` use these files too. Their strings live in `en.json` under one namespace per template, like `"emails.passwordReset": { "subject": "..." }`. Keep it to that one level of nesting, because Transifex ignores anything deeper.

Emails go out in the recipient's `User.language`, falling back to English. In a template, use `p= t("emails.x.key", { vars })` for text. When a string has markup in it, like a link, use `p!= tHtml(...)`. Subjects are plain text, so they use `!= t(...)`. `formatMoney`, `formatAmount` and `formatDate` format values for the recipient's language. `test/emailTemplates.spec.ts` checks that every key exists and that the escaping is right.
