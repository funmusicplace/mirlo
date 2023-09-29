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
      <meta name="twitter:title" content="Mirlo" />
      <meta
        name="twitter:description"
        content="A music distribution and patronage site."
      />
      <meta
        property="twitter:image"
        content={image ?? "/android-chrome-512x512.png"}
      />
      {player && <meta property="twitter:player" content={player} />}
    </Helmet>
  );
};
