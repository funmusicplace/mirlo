To help out with translation, please read this post.

At Mirlo we use Transifex to manage our translations.

# How this works:

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

## How to help

If you want to help out with translating the text into one of our languages, please DM your email **with the language you want to help translate** on our discord or our email (hi@mirlo.space) so that we can get you set up with the Transifex project. In Transifex you will be assigned to the language, and you can then add translation strings for the language.

Please use the specific forum posts for each language to discuss language details

🔗 **Link to the Mirlo project on Transifex:** https://app.transifex.com/mirlo/mirlo/

> Note: due to a limitation in Transifex, some strings that aren't used anymore still show up. As best as we can we've tagged them as `unused`. You can exclude them from results that way.
