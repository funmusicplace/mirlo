interface LinkFormData {
  linkArray: Link[];
}

const normalizeStoredLink = (link: Link): Link => ({
  ...link,
  inHeader: link.inHeader ?? true,
  linkLabel: link.linkLabel ?? "",
  linkType: link.linkType ?? "",
  iconUrl: link.iconUrl ?? undefined,
});

export function transformFromLinks(
  artist: Pick<Artist, "links" | "linksJson">
): LinkFormData {
  const normalizedJsonLinks = (artist.linksJson ?? []).map((link) =>
    normalizeStoredLink(link)
  );

  return {
    linkArray: [
      ...(artist.links?.map((l) => ({
        url: l.replace("mailto:", ""),
        linkType: "",
        linkLabel: "",
        inHeader: true,
        iconUrl: undefined,
      })) ?? []),
      ...normalizedJsonLinks,
    ],
  };
}
