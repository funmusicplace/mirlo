interface Paginated<T> {
  results: T[];
  limit: number;
  offset: number;
  pages: number;
}

interface LoggedInUser {
  email: string;
  name: string;
  id: number;
}

interface Track {
  title: string;
  id: number;
  status: "preview" | "must-own";
  artistId: number;
  trackGroup: TrackGroup;
  artist: Artist;
  image: Image;
}

interface TrackGroup {
  title: string;
  published: boolean;
  enabled: boolean;
  id: number;
  type: "lp" | "ep" | "album" | "single";
  releaseDate: string;
  about: string;
  artistId: number;
  tracks: Track[];
  cover: { id: number; url: string };
}

interface Artist {
  name: string;
  bio: string;
  userId: number;
  id: number;
  trackGroups: TrackGroup[];
}

interface Image {
  small: {
    url: string;
    width: number;
    height: number;
  };
}

interface User {
  id: number;
  email: string;
  name?: string;
  artists: Artist[];
  updatedAt: string;
}
