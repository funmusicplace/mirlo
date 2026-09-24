import DefaultTheme from "vitepress/theme";
import { h } from "vue";

import Footer from "./Footer.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(Footer),
    });
  },
};
