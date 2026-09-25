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
    getAbsolutePath("@storybook/addon-themes"),
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
    return config;
  },
};
export default config;
