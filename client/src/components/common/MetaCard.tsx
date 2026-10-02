import { useInstanceSettings } from "queries/instanceSettings";
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
  const { name: instanceName } = useInstanceSettings();
  const pageTitle =
    title && title !== instanceName
      ? `${title} | ${instanceName}`
      : instanceName;

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
