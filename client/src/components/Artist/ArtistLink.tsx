import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";

const ArtistLink: React.FC<{ artist?: Artist }> = ({ artist }) => {
  if (!artist) {
    return null;
  }
  return <Link to={getArtistUrl(artist)}>{artist?.name}</Link>;
};
export default ArtistLink;
