import { css } from "@emotion/css";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import remarkEmbedder from "@remark-embedder/core";
import remarkEmbedder from "utils/remarkEmbedder";
import MarkdownWrapper from "./MarkdownWrapper";

const BlackbirdTransformer = {
  name: "BlackbirdTransformer",
  // shouldTransform can also be async
  shouldTransform(url: string) {
    const { host, pathname } = new URL(url);

    const includesHost = ["localhost:8080", "mirlo.space"].includes(host);
    const isWidget = pathname.includes("/widget");
    return includesHost && isWidget;
  },
  // We want to probably differentiate these from widgets in an
  // iframe and widgets happening inside our own blog posts
  getHTML(url: string) {
    const iframeUrl = url.replace("/s/", "/embed/");

    return `<iframe src="${iframeUrl}" style="width:100%; height:162px; border:0; border-radius: 4px; overflow:hidden;" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>`;
  },
};

const PostContent: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <MarkdownWrapper>
      <ReactMarkdown
        className={css`
          ul {
            margin-left: 1rem;
          }
        `}
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

export default PostContent;
