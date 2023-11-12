import styled from "@emotion/styled";

const MarkdownWrapper = styled.div`
  margin-top: 0.5rem;

  h1 {
    font-size: 2rem;
  }
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  h3 {
    font-size: 1rem;
  }

  p {
    margin-bottom: 1.5rem;
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
