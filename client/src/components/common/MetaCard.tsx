import { Helmet } from "react-helmet";

function strip(html: string) {
  let doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export const MetaCard: React.FC<{
  title: string;
  description: string;
  image?: string;
  player?: string;
}> = ({ title, description, image, player }) => {
  return (
    <Helmet>
      <title>{`Mirlo: ${title}`}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:url" content={window.location.pathname} />
      <meta property="og:description" content={strip(description)} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={strip(description)} />
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
      {player && <meta property="og:type" content="song" />}
      {player && <meta property="og:type" content="song" />}
      {player && <meta property="og:video" content={player} />}
      {player && <meta property="og:video:secure_url" content={player} />}
      {player && <meta property="og:video:type" content="text/html" />}
      {player && <meta property="og:video:height" content="600" />}
      {player && <meta property="og:video:width" content=" 162" />}
      {player && <meta property="twitter:player" content={player} />}
      {player && <meta property="twitter:player:width" content="600" />}
      {player && <meta property="twitter:player:width" content="162" />}
    </Helmet>
  );
};
