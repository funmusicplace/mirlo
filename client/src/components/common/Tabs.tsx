import styled from "@emotion/styled";

const Tabs = styled.ul`
  list-style: none;
  margin: 0.5rem 0.5rem 0.5rem 0;
  border-bottom: 3px solid #ddd;

  > li {
    display: inline-block;
    margin-right: 1rem;
    a {
      color: ${(props) => props.theme.colors.text};
      text-decoration: none;
      padding: 0.25rem 0.5rem 0.25rem 0.25rem;
      display: block;
      font-size: 1.2rem;
      transition: 0.1s border-bottom;

      &.active {
        border-bottom: 3px solid ${(props) => props.theme.colors.primary};
        margin-bottom: -3px;
      }

      &:hover {
        border-bottom: 3px solid ${(props) => props.theme.colors.primary};
        margin-bottom: -3px;
      }

      @media (prefers-color-scheme: dark) {
        color: ${(props) => props.theme.colors.textDark};
      }
    }
  }
`;

export default Tabs;
