import type { Decorator } from "@storybook/react";
import React from "react";

import { CLIENT_ROOT } from "../../constants";

/** Story ids of the release widget stories, by `?variant=` */
const STORY_FOR_VARIANT: Record<string, string> = {
  card: "features-embeds-trackgroupwidget--card",
  compact: "features-embeds-trackgroupwidget--compact",
  strip: "features-embeds-trackgroupwidget--strip",
};

/** Storybook URL of one of the Features/Embeds/TrackGroupWidget stories */
export const widgetStorySrc = (storyId: string) =>
  `/iframe.html?viewMode=story&id=${storyId}`;

/**
 * The embed preview in the "Embed or share" picker points at the real app
 * (CLIENT_ROOT/widget/...), which isn't running under Storybook.
 * Point it at the matching Features/Embeds/TrackGroupWidget story instead, and show
 * the copied code with the production domain.
 */
export const useLocalWidgetPreviews: Decorator = (Story) => {
  React.useEffect(() => {
    const widgetPrefix = `${CLIENT_ROOT}/widget/trackGroup/`;
    const rewrite = () => {
      document.querySelectorAll("iframe").forEach((iframe) => {
        const src = iframe.getAttribute("src") ?? "";
        if (!src.startsWith(widgetPrefix)) return;
        const variant = new URL(src).searchParams.get("variant") ?? "card";
        iframe.setAttribute(
          "src",
          widgetStorySrc(STORY_FOR_VARIANT[variant] ?? STORY_FOR_VARIANT.card)
        );
      });
      document.querySelectorAll("code").forEach((code) => {
        code.childNodes.forEach((node) => {
          if (
            node.nodeType === Node.TEXT_NODE &&
            node.nodeValue?.includes(CLIENT_ROOT)
          ) {
            node.nodeValue = node.nodeValue
              .split(CLIENT_ROOT)
              .join("https://mirlo.space");
          }
        });
      });
    };
    const observer = new MutationObserver(rewrite);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    rewrite();
    return () => observer.disconnect();
  }, []);
  return <Story />;
};
