import React from "react";
import styled from "@emotion/styled";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

const getGridStyles = (coverCount: number) => {
  switch (coverCount) {
    case 1:
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
      };
    case 2:
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr",
      };
    case 3:
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
    default:
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
  }
};

const CompositeContainer = styled.div<{ coverCount: number }>`
  display: grid;
  gap: 2px;
  background-color: var(--mi-tint-color);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  width: 100%;
  height: 100%;
  grid-template-columns: ${(props) =>
    getGridStyles(props.coverCount).gridTemplateColumns};
  grid-template-rows: ${(props) =>
    getGridStyles(props.coverCount).gridTemplateRows};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

export const ArtistFallbackComposite: React.FC<{
  artist: Artist;
}> = ({ artist }) => {
  // Get covers: for regular artists use their trackGroups, for labels use roster artists' trackGroups
  const tracksForCovers = artist.isLabelProfile
    ? (artist.artistLabels
        ?.flatMap((label) => label.artist.trackGroups)
        .slice(0, 4) ?? [])
    : (artist.trackGroups?.slice(0, 4) ?? []);

  const covers = tracksForCovers
    .map((tg) => tg.cover?.sizes?.[300])
    .filter((cover): cover is string => !!cover);

  // If we don't have any covers, render empty placeholder
  if (covers.length === 0) {
    return (
      <ImageWithPlaceholder
        src={undefined}
        alt={artist.name}
        size={300}
        square
      />
    );
  }

  return (
    <CompositeContainer coverCount={covers.length}>
      {covers.map((coverUrl, idx) => (
        <img key={idx} src={coverUrl} alt={`Album cover ${idx + 1}`} />
      ))}
    </CompositeContainer>
  );
};

export default ArtistFallbackComposite;
