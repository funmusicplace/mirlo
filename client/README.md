# Mirlo Client

## Translation

You'll need `REACT_APP_TRANSIFEX_TOKEN` set.

Documentation here: https://developers.transifex.com/docs/i18next

### Pushing code from en.json to transifex

```
TRANSIFEX_TOKEN=<token> TRANSIFEX_SECRET=<secret> npx txjs-cli push src/translation/en.json --parser=i18next
```

## Storybook

Some components will have a `.stories.tsx` file next to them. These can be useful to quickly preview how a component will behave in various states/themes. See ["What's a story?"](https://storybook.js.org/docs/get-started/whats-a-story) for an intro to writing them!

To run storybook, use `yarn client:storybook`. Some general test data for stories/tests is provided in the `test/mocks` folder.
