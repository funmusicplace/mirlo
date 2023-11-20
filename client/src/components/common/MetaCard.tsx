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
      {image && <meta property="twitter:card" content="summary_large_image" />}{" "}
      {player && <meta property="twitter:player" content={player} />}
    </Helmet>
  );
};
