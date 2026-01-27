import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import remarkEmbedder from "@remark-embedder/core";
import remarkEmbedder from "utils/remarkEmbedder";
import MarkdownWrapper from "./MarkdownWrapper";
import LoadingSpinner from "./LoadingSpinner";
import { isWidgetUrl } from "utils/tracks";
import api from "services/api";

const BlackbirdTransformer = {
  name: "BlackbirdTransformer",
  // shouldTransform can also be async
  shouldTransform(url: string) {
    return isWidgetUrl(url);
  },
  // We want to probably differentiate these from widgets in an
  // iframe and widgets happening inside our own blog posts
  getHTML(url: string) {
    const iframeUrl = url.replace("/s/", "/embed/");

    return `<iframe src="${iframeUrl}" style="width:100%; height: 137px; border:0; border-radius: 4px; overflow:hidden;"></iframe>`;
  },
};

const MarkdownContent: React.FC<{
  content?: string;
  source?: string;
  className?: string;
}> = ({ content: externalContent, source, className }) => {
  const [content, setContent] = React.useState(externalContent);
  React.useEffect(() => {
    const callback = async () => {
      if (source) {
        let sourceContent = "";
        if (source.includes("cookie-policy")) {
          const response = await api.get<string>("settings/cookiePolicy");
          sourceContent = response.result;
        } else if (source.includes("terms")) {
          const response = await api.get<string>("settings/terms");
          sourceContent = response.result;
        } else if (source.includes("privacy")) {
          const response = await api.get<string>("settings/privacyPolicy");
          sourceContent = response.result;
        } else if (source.includes("content-policy")) {
          const response = await api.get<string>("settings/contentPolicy");
          sourceContent = response.result;
        } else {
          sourceContent = await fetch(source).then((resp) => resp.text());
        }
        setContent(sourceContent);
      } else {
        setContent(externalContent ?? "");
      }
    };
    callback();
  }, [externalContent, source]);

  if (content === undefined || content === null) {
    return <LoadingSpinner />;
  }

  return (
    <MarkdownWrapper className={className} id="markdown-content">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkEmbedder, { transformers: [BlackbirdTransformer] }],
        ]}
      >
        {content}
      </ReactMarkdown>
    </MarkdownWrapper>
  );
};

export default MarkdownContent;
