import styled from "@emotion/styled";
import { bp } from "../../constants";

const MarkdownWrapper = styled.div`
  margin-top: 0.5rem;
  opacity: 0.9;

  h1 {
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-weight: bold;
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.2rem;
  }

  iframe {
    margin: 1rem 0;
  }

  img {
    max-width: 100%;
  }

  iframe {
    width: 700px;
    max-width: 100%;
  }

  iframe[src*="widget/track"] {
    width: 700px;
    height: 130px;
    max-width: 100%;
  }

  iframe[src*="widget/trackGroup"] {
    width: 700px;
    height: 371px;
    max-width: 100%;
  }

  li {
    margin-left: 1.2rem;
  }

  ul,
  ol {
    margin-left: 1rem;
    margin-bottom: 1rem;
    margin-top: 0.75rem;
  }

  li > ol,
  li > ul {
    list-style: lower-alpha;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: break-word;
    max-width: 100%;
    display: block;
    overflow: scroll;
  }

  p {
    clear: both;
    margin-bottom: 0.75rem;
  }

  strong {
    font-weight: bold;
  }

  table {
    width: 100%;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: var(--mi-lighten-x-background-color);

    @media screen and (max-width: ${bp.small}px) {
      max-width: 340px;
      overflow-x: scroll;
      display: block;
    }

    td {
      padding: 0.5rem;
    }
  }
`;

export default MarkdownWrapper;
