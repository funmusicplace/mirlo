# Mirlo Client

## Translation

You'll need `REACT_APP_TRANSIFEX_TOKEN` set.

Documentation here: https://developers.transifex.com/docs/i18next

### Pushing code from en.json to transifex

```
TRANSIFEX_TOKEN=<token> TRANSIFEX_SECRET=<secret> npx txjs-cli push src/translation/en.json --parser=i18next
```
