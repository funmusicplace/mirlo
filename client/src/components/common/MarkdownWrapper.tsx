import styled from "@emotion/styled";

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

  p {
    margin-bottom: 0.75rem;
  }

  iframe {
    margin: 1rem 0;
  }

  ul {
    margin-left: 1rem;
    margin-bottom: 1rem;
  }
`;

export default MarkdownWrapper;
