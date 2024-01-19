import { css } from "@emotion/css";
import { Link, LinkProps } from "react-router-dom";

interface LinkWithIconProps extends LinkProps {
  children: React.ReactNode;
}

const LinkWithIcon: React.FC<LinkWithIconProps> = ({ children, ...props }) => {
  return (
    <Link
      {...props}
      className={css`
        display: flex;
        align-items: center;
        text-decoration: underline;
        margin-bottom: 0.25rem;

        svg {
          margin-left: 0.25rem;
        }
      `}
    >
      {children}
    </Link>
  );
};

export default LinkWithIcon;
