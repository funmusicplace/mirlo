import i18n, { toLanguageTag } from "i18n";
import api from "services/api";
import {
  formatTrackArtistLine,
  getArtistUrl,
  getReleaseArtistName,
} from "utils/artist";
import { widgetPath } from "utils/tracks";

import { SlashCommandConfig } from "./SlashCommands";

const SLASH_COMMANDS: SlashCommandConfig[] = [
  {
    trigger: "track",
    noResultsLabel: "No tracks found",
    search: async (query) => {
      const response = await api.getMany<Track>("tracks", {
        title: query,
        take: "10",
      });
      return response.results.map((r) => ({
        id: r.id,
        label: [
          formatTrackArtistLine(
            r,
            (main, featured) =>
              i18n.t("trackArtists.lineWithGuests", { main, featured }),
            toLanguageTag(i18n.resolvedLanguage)
          ),
          r.title,
        ]
          .filter(Boolean)
          .join(" - "),
      }));
    },
    onSelect: (item, chain) => {
      chain
        .addIframe({
          src: widgetPath(+item.id, "track"),
          height: 137,
          width: 700,
        })
        .run();
    },
  },
  {
    trigger: "release",
    noResultsLabel: "No releases found",
    search: async (query) => {
      const [byTitle, byArtist] = await Promise.all([
        api.getMany<TrackGroup>("trackGroups", {
          title: query,
          take: "10",
        }),
        api.getMany<TrackGroup>("trackGroups", {
          artistName: query, // Assuming API supports this param
          take: "10",
        }),
      ]);

      // Deduplicate by ID and combine results
      const seen = new Set<number>();
      const results = [...byTitle.results, ...byArtist.results]
        .filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        })
        .slice(0, 10); // Cap at 10 results

      return results.map((r) => ({
        id: r.id,
        label: [
          getReleaseArtistName(r, toLanguageTag(i18n.resolvedLanguage)),
          r.title,
        ]
          .filter(Boolean)
          .join(" - "),
      }));
    },
    onSelect: (item, chain) => {
      chain
        .addIframe({
          src: widgetPath(+item.id, "trackGroup"),
          height: 137,
          width: 700,
        })
        .run();
    },
  },
  {
    trigger: "artist",
    noResultsLabel: "No artists found",
    search: async (query) => {
      const response = await api.getMany<Artist>("artists", {
        name: query,
        take: "10",
      });
      return response.results.map((r) => ({
        id: r.id,
        label: r.name,
        url: getArtistUrl(r),
      }));
    },
    onSelect: (item, chain, from) => {
      chain
        .insertText(item.label)
        .selectText({ from, to: from + item.label.length })
        .updateLink({ href: item.url })
        .run();
    },
  },
];

export default SLASH_COMMANDS;
