<script setup>
const columns = [
  {
    heading: "Mirlo",
    links: [
      { text: "Home", href: "https://mirlo.space" },
      { text: "Our story", href: "/story" },
      { text: "Payouts", href: "/payouts" },
      { text: "For maintainers", href: "/maintaining" },
    ],
  },
  {
    heading: "Docs",
    links: [
      { text: "Features", href: "/features" },
      { text: "How tos", href: "/how-tos" },
      { text: "Developer API", href: "/api" },
      { text: "Hosting Mirlo", href: "/hosting" },
      { text: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { text: "GitHub", href: "https://github.com/funmusicplace/mirlo" },
      { text: "Discord", href: "https://discord.gg/VjKq26raKX" },
      { text: "Mastodon", href: "https://musician.social/@mirlo" },
      { text: "Bluesky", href: "https://bsky.app/profile/mirlo.space" },
      { text: "Instagram", href: "https://instagram.com/mirlo.space" },
    ],
  },
];
</script>

<template>
  <footer class="mirlo-footer">
    <div class="mirlo-footer__container">
      <div class="mirlo-footer__columns">
        <div
          v-for="column in columns"
          :key="column.heading"
          class="mirlo-footer__column"
        >
          <h2 class="mirlo-footer__heading">{{ column.heading }}</h2>
          <ul class="mirlo-footer__list">
            <li v-for="link in column.links" :key="link.text">
              <a :href="link.href">{{ link.text }}</a>
            </li>
          </ul>
        </div>
      </div>
      <p class="mirlo-footer__copyright">
        Mirlo is an open source, worker-owned cooperative platform.
      </p>
    </div>
  </footer>
</template>

<style scoped>
.mirlo-footer {
  border-top: 1px solid var(--vp-c-divider);
  padding: 2rem 1.5rem;
}

.mirlo-footer__container {
  max-width: var(--vp-layout-max-width, 1440px);
  margin: 0 auto;
}

.mirlo-footer__columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .mirlo-footer__columns {
    grid-template-columns: repeat(3, 1fr);
  }
}

.mirlo-footer__heading {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  border-top: none;
  padding-top: 0;
  letter-spacing: normal;
}

.mirlo-footer__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.mirlo-footer__list a {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.mirlo-footer__list a:hover {
  color: var(--vp-c-brand-1);
}

.mirlo-footer__copyright {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin: 0;
}
</style>
