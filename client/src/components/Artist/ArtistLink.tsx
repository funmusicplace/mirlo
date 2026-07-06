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

  // location.pathname keeps percent-encoding, so decode before comparing
  // against the slug (which is stored decoded, e.g. "rauðvik")
  let pathname = location.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // malformed percent-encoding — compare against the raw pathname
  }
  const isCurrent = !!artist.urlSlug && pathname.includes(artist.urlSlug);

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
