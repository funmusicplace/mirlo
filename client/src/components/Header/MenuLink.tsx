import { Link, LinkProps } from "react-router-dom";

const MenuLink: React.FC<LinkProps> = (props) => {
  const { children, ...otherProps } = props;
  return (
    <Link
      className="rounded-[3px] text-(--mi-text-color)! block p-[.5em] no-underline! wrap-anywhere active:bg-(--mi-text-color) active:text-(--mi-background-color)! active:underline! focus-visible:bg-(--mi-text-color) focus-visible:text-(--mi-background-color)! focus-visible:underline! hover:bg-(--mi-text-color) hover:text-(--mi-background-color)! hover:underline!"
      {...otherProps}
    >
      {children}
    </Link>
  );
};

export default MenuLink;
