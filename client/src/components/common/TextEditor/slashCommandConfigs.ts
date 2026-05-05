import api from "services/api";
import { widgetUrl } from "utils/tracks";
import { getArtistUrl } from "utils/artist";
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
        label: `${r.trackGroup.artist?.name} - ${r.title}`,
      }));
    },
    onSelect: (item, chain) => {
      chain
        .addIframe({
          src: widgetUrl(+item.id, "track"),
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
      const response = await api.getMany<TrackGroup>("trackGroups", {
        title: query,
        take: "10",
      });
      return response.results.map((r) => ({
        id: r.id,
        label: `${r.artist?.name} - ${r.title}`,
      }));
    },
    onSelect: (item, chain) => {
      chain
        .addIframe({
          src: widgetUrl(+item.id, "trackGroup"),
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
