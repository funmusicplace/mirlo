import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Button, { ButtonProps } from "components/common/Button";
import { queryArtist } from "queries";
import { Link, LinkProps, useParams } from "react-router-dom";

const ArtistRouterLink: React.FC<LinkProps> = (props) => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;
  return (
    <Link
      {...props}
      className={
        colors &&
        css`
          color: ${colors?.primary} !important;
          background-color: ${colors?.background} !important;
        `
      }
    />
  );
};

export const ArtistButton: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = (props) => {
  const { artistId } = useParams();

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;

  return (
    <Button
      {...props}
      className={css`
        color: ${colors?.secondary} !important;
        background-color: ${colors?.primary} !important;
      `}
    />
  );
};

export default ArtistRouterLink;
