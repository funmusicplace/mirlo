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
    <>
      {/* @ts-ignore */}
      <Helmet>
        <title>{`${title} on Mirlo`}</title>
        <meta name="description" content={description} />
      </Helmet>
    </>
  );
};
