import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Use Canonical URL, but only the path and with no trailing /
  // End result is like: `/en/latest`
  base: process.env.READTHEDOCS_CANONICAL_URL
    ? new URL(process.env.READTHEDOCS_CANONICAL_URL).pathname.replace(/\/$/, "")
    : "",
  title: "Mirlo",
  description:
    "Documentation for an open source music sales and patronage platform.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "FAQ", link: "/faq" },
    ],
    i18nRouting: true,
    sidebar: [
      {
        text: "Home",
        link: "/",
      },
      {
        text: "FAQ",
        link: "/faq",
      },
      {
        text: "API",
        link: "/api",
      },
      {
        text: "Maintaining Mirlo",
        link: "/maintaining",
        items: [
          {
            text: "System Architecture",
            link: "/maintaining/system-architecture",
          },
          { text: "Rapid Response", link: "/maintaining/rapid-response" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/funmusicplace/mirlo" },
    ],
  },
});
