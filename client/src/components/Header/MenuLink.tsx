import { Link, LinkProps } from "react-router-dom";

const MenuLink: React.FC<LinkProps> = (props) => {
  const { children, ...otherProps } = props;
  return (
    <Link
      className="rounded-[3px] block p-[.5em] wrap-anywhere text-(--mi-black)! no-underline! hover:bg-(--mi-black)! hover:text-(--mi-white)! hover:underline! focus-visible:bg-(--mi-black)! focus-visible:text-(--mi-white)! focus-visible:underline! active:bg-(--mi-black)! active:text-(--mi-white)! active:underline! [[data-mi-high-contrast]_&]:text-(--mi-text-color)! [[data-mi-high-contrast]_&]:hover:bg-(--mi-button-color)! [[data-mi-high-contrast]_&]:hover:text-(--mi-button-text-color)! [[data-mi-high-contrast]_&]:focus-visible:bg-(--mi-button-color)! [[data-mi-high-contrast]_&]:focus-visible:text-(--mi-button-text-color)! [[data-mi-high-contrast]_&]:active:bg-(--mi-button-color)! [[data-mi-high-contrast]_&]:active:text-(--mi-button-text-color)!"
      {...otherProps}
    >
      {children}
    </Link>
  );
};

export default MenuLink;
