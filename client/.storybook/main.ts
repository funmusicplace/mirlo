import { join, dirname } from "path";

import type { StorybookConfig } from "@storybook/react-vite";
import type { PluginOption } from "vite";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
const config: StorybookConfig = {
  // .storybook/public holds MSW's mockServiceWorker.js, kept out of the app's
  // public/ so it doesn't ship with the real build.
  staticDirs: ["../public", "./public"],
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("storybook-addon-remix-react-router"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  // PurchaseElements renders nothing without a publishable key, and CI has no
  // client/.env. Stripe.js is mocked below, so any key will do.
  env: (config) => ({
    ...config,
    VITE_PUBLISHABLE_STRIPE_KEY: "pk_test_storybook",
  }),
  // Storybook inherits vite.config.mjs. The legacy plugin's transpile target
  // can't handle BigInt literals in Storybook's own bundle, and the PWA plugin
  // would register a service worker that fights MSW's, so drop both.
  async viteFinal(config) {
    const isUnwanted = (plugin: PluginOption) =>
      !!plugin &&
      typeof plugin === "object" &&
      "name" in plugin &&
      /^vite:legacy|^vite-plugin-pwa/.test(plugin.name);
    const plugins = (config.plugins ?? []).flat(Infinity) as PluginOption[];
    config.plugins = plugins.filter((plugin) => !isUnwanted(plugin));
    config.publicDir = false;
    // Stripe.js needs the network and a real connected account, so stories
    // get a local stand-in (see ./stripeMock.ts).
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@stripe/react-stripe-js": join(__dirname, "mocks/react-stripe-js.tsx"),
        "@stripe/stripe-js": join(__dirname, "mocks/stripe-js.ts"),
      },
    };
    return config;
  },
};
export default config;
