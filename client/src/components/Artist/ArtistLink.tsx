import { Link, useLocation } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const ArtistLink: React.FC<{ artist?: Artist }> = ({ artist }) => {
  const location = useLocation();
  if (!artist) {
    return null;
  }

  if (artist.urlSlug && location.pathname.includes(artist.urlSlug)) {
    return artist.name;
  }

  return <Link to={getArtistUrl(artist)}>{artist?.name}</Link>;
};
export default ArtistLink;
