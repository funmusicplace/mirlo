import { Link, LinkProps } from "react-router-dom";

const MenuLink: React.FC<LinkProps> = (props) => {
  const { children, ...otherProps } = props;
  return (
    <Link
      className="rounded-[3px] mi-menu-link block p-[.5em] wrap-anywhere"
      {...otherProps}
    >
      {children}
    </Link>
  );
};

export default MenuLink;
