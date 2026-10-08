# Troubleshooting

Problems listening to or buying music on Mirlo, and what to try.
If you run your own Mirlo server, see
[Hosting troubleshooting](./hosting/troubleshooting.md) instead.

[[toc]]

## Playback

::: details On Android, the next song doesn't start when one ends

Some Android phones pause a browser tab once the screen turns off,
so the player can't move on by itself. We're still trying to
reproduce this ([issue #1408](https://github.com/funmusicplace/mirlo/issues/1408)).
Things that usually help:

- Keep the screen on and Mirlo in the foreground.
- Exempt your browser from battery optimization (on Samsung: Settings →
  Apps → your browser → Battery → _Unrestricted_).
- Turn off data saver for your browser.
- Install Mirlo to your home screen and open it from there.

Still happening? Email [hi@mirlo.space](mailto:hi@mirlo.space) with your
phone model, Android version and browser.

:::

::: details A track won't play

Reload the page and check your connection. If you see a notice about
plays, the artist limits how often you can listen before buying;
buying the release removes the limit.

:::

## Buying

::: details I can't find a way to buy or download a release, or to buy a CD

On a release's page, look for a **Buy** or **Download** button near the top. If there is one, you can buy or download that release. If there isn't, the artist has chosen to make it available for streaming only.

CDs, vinyl, T-shirts and other physical items are in the **Merch** tab on the artist's page. The artist may have renamed this tab. Merch that goes with a particular release also shows up on that release's page.

Not every artist sells things on Mirlo. Some just share their music to listen to.

:::

## Downloads

::: details My download didn't start

Check your browser's downloads list and pop-up blocker. If you've
bought the release, you can download it again any time from your
collection.

:::

## Still stuck?

Email [hi@mirlo.space](mailto:hi@mirlo.space), hop on our [discord](https://discord.gg/VjKq26raKX), or open an issue on
[GitHub](https://github.com/funmusicplace/mirlo/issues), and tell us
your device, operating system and browser.
