import { Link, useLocation } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const ArtistLink: React.FC<{ artist?: Artist; className?: string }> = ({
  artist,
  className,
}) => {
  const location = useLocation();
  if (!artist) {
    return null;
  }

  const isCurrent =
    !!artist.urlSlug && location.pathname.includes(artist.urlSlug);

  return (
    <Link
      to={getArtistUrl(artist)}
      aria-current={isCurrent ? "page" : undefined}
      className={className}
    >
      {artist.name}
    </Link>
  );
};
export default ArtistLink;
