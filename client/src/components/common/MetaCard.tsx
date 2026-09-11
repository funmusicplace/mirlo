import { Helmet } from "react-helmet";

function strip(html: string) {
  let doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

const SITE_NAME = "Mirlo";

export const MetaCard: React.FC<{
  title: string;
  description: string;
  image?: string;
  player?: string;
}> = ({ title, description, image, player }) => {
  const pageTitle =
    title && title !== SITE_NAME ? `${title} | ${SITE_NAME}` : SITE_NAME;

  return (
    <>
      {/* @ts-ignore */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
      </Helmet>
    </>
  );
};
