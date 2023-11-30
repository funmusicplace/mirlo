import { Helmet } from "react-helmet";

export const MetaCard: React.FC<{
  title: string;
  description: string;
  image?: string;
  player?: string;
}> = ({ title, description, image, player }) => {
  return (
    <Helmet>
      <title>Mirlo: {title}</title>
      <meta name="description" content={title} />
      <meta property="og:title" content={title} />
      <meta property="og:url" content={window.location.pathname} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta
        property="twitter:image"
        content={image ?? "/android-chrome-192x192.png"}
      />
      <meta
        property="og:image"
        content={image ?? "/android-chrome-192x192.png"}
      />
      {image && (
        <meta property="twitter:card" content={player ? "player" : "summary"} />
      )}
      {player && (
        <>
          <meta property="og:type" content="song" />
          <meta property="og:video" content={player} />
          <meta property="og:video:secure_url" content={player} />
          <meta property="og:video:type" content="text/html" />
          <meta property="og:video:height" content="600" />
          <meta property="og:video:width" content=" 162" />
          <meta property="twitter:player" content={player} />
          <meta property="twitter:player:width" content="600" />
          <meta property="twitter:player:width" content="162" />
        </>
      )}
    </Helmet>
  );
};
