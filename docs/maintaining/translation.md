# Translation

At Mirlo we use Transifex to manage our translations.

## How to get started

Please DM us on discord **with your email and the language you want to help translate**, or send us an email at hi@mirlo.space. We will get you set up with the project on Transifex : you will be assigned to your language, for which you'll be able to add translation strings.

🔗 **Link to the Mirlo project on Transifex:** https://app.transifex.com/mirlo/mirlo/

> Note: due to a limitation in Transifex, some strings that aren't used anymore still show up. As best as we can we've tagged them as `unused`. You can exclude them from results that way. It's possible that we can delete these strings programmatically, there's a ticket to

## How to translate Mirlo using Transifex

First off, you'll find general directions for Mirlo's tone and vocabulary in this document: [Verbal communication guidelines](/maintaining/verbal-communication-guidelines.md)

- Try to understand where the string will appear on Mirlo's website.
  The "key" of each string will give you some insight, don't hesitate to look up Comments or write a new one for this string if you lack good context. Transifex allows your edits to appear Live immediately after you save them, so you can see how what you just wrote integrates with the whole. Keep Mirlo open in another tab and check back and forth regularly :)
- Keep a consistent tone, use the same words for the same situations, and do your best to be faithful to what was originally written.
  Transifex uses a Glossary (bottom right window while translating, second tab from the right) populated by other translators which puts dotted lines under regularly used words and expressions: use it to your advantage.
- If you're unsure on how to translate a word or expression, try looking up at what other similar platforms did for your language (Bandcamp, Soundcloud...).
  [Linguee](https://www.linguee.com/) is also a good tool to see how such or such word is used, with real-world examples of translations. Finally, ask around from people who work in the music industry to know which words they use.

If you're still a bit lost, need help in any way or simply want to share your progress, feel free to chime in [on our discord](https://discord.com/channels/1070731899317796974/1245361375396626432) ! Note that you'll need the Translator role to view the translation section where most of this talk is kept.

## How this works

In our code we store a JSON file that contains "keys" that point to English strings. Eg.

```
{
...
"login": "Log in"
...
}
```

Developers add new strings to this file, with the default English language string. They will then use the key in the code itself:

```
<i>{t('login')}</i>
```

Will show:

_Log in_

Then they will upload the JSON file to Transifex (see the README for instructions on how to do this).

At that point the translations become available for translators to translate in Transifex.

If you want to discuss or edit English language strings with that please edit the JSON file in the repo directly!

## Translating the documentation site (docs.mirlo.space)

Unlike the main Mirlo app, this documentation site is **not** wired up to Transifex — VitePress content is plain Markdown, not JSON strings, so translations here are done directly via pull request.

### How it's structured

VitePress's [i18n routing](https://vitepress.dev/guide/i18n) works off of top-level locale directories. English lives directly under `docs/` (the "root" locale), and every other language gets its own directory named with its [locale code](https://vitepress.dev/guide/i18n#configuring-vitepress-for-i18n), e.g. `docs/fr/` for French. Each locale directory should mirror the structure of the English docs it's translating, so `docs/faq.md` becomes `docs/fr/faq.md`, `docs/how-tos/label-accounts.md` becomes `docs/fr/how-tos/label-accounts.md`, and so on.

You don't have to translate every page at once — a locale can start with just an `index.md` and grow from there. Pages that don't have a translated version yet will simply fall back to linking to the English page.

### Adding a new language

1. Create a directory under `docs/` named after the locale code (e.g. `docs/es/` for Spanish).
2. Add an `index.md` in that directory, translating `docs/index.md`'s homepage content.
3. Register the locale in `docs/.vitepress/config.mts` under the top-level `locales` key:

   ```ts
   locales: {
     root: {
       label: "English",
       lang: "en",
     },
     fr: {
       label: "Français",
       lang: "fr",
       title: "Mirlo",
       description: "...", // translated site description
       themeConfig: {
         nav: [...], // translated nav, optional
         sidebar: [...], // translated sidebar, optional
       },
     },
     // add your new locale here
   },
   ```

   The `label`/`lang` keys are required — they drive the language switcher in the site header. `title`, `description`, and a locale-specific `themeConfig` (nav, sidebar, etc.) are optional and only needed once you have translated content for them to point to.

4. Translate additional pages by creating the matching file under your locale directory (same relative path as the English original), and link to them from your locale's `themeConfig.nav`/`sidebar` as they become available.
5. Run `yarn docs:dev` locally to preview, and `yarn docs:build` to confirm the site builds before opening a PR.

If you'd like to help translate the docs site into a language that doesn't have a directory yet, feel free to open a PR following the steps above, or reach out to us first on Discord or at hi@mirlo.space if you'd like guidance.
