import { Helmet } from "react-helmet";

export const MetaCard: React.FC<{
  title: string;
  description: string;
  image?: string;
}> = ({ title, description, image }) => {
  return (
    <Helmet>
      <title>Mirlo: {title}</title>

      <meta name="description" content={title} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image ?? "/images/blackbird.png"} />
    </Helmet>
  );
};
