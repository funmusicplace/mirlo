import styled from "@emotion/styled";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import remarkEmbedder from "@remark-embedder/core";
import remarkEmbedder from "utils/remarkEmbedder";

const PostContentWrapper = styled.div`
  margin-top: 2rem;

  h1 {
    font-size: 1.2rem;
  }
  h2 {
    font-size: 1.1rem;
  }

  p {
    margin-bottom: 0.75rem;
  }

  iframe {
    margin: 1rem 0;
  }
`;

const BlackbirdTransformer = {
  name: "BlackbirdTransformer",
  // shouldTransform can also be async
  shouldTransform(url: string) {
    const { host, pathname } = new URL(url);

    const includesHost = ["localhost:8080"].includes(host);
    const isWidget = pathname.includes("/widget");
    return includesHost && isWidget;
  },
  // We want to probably differentiate these from widgets in an
  // iframe and widgets happening inside our own blog posts
  getHTML(url: string) {
    const iframeUrl = url.replace("/s/", "/embed/");

    return `<iframe src="${iframeUrl}" style="width:100%; height:160px; border:0; border-radius: 4px; overflow:hidden;" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>`;
  },
};

const PostContent: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <PostContentWrapper>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkEmbedder, { transformers: [BlackbirdTransformer] }],
        ]}
      >
        {content}
      </ReactMarkdown>
    </PostContentWrapper>
  );
};

export default PostContent;
