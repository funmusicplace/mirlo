import { Link, LinkProps } from "react-router-dom";

const MenuLink: React.FC<LinkProps> = (props) => {
  const { children, ...otherProps } = props;
  return (
    <Link
      className="rounded-[3px] text-black! block p-[.5em] no-underline! active:bg-black active:text-white! active:underline! focus-visible:bg-black focus-visible:text-white! focus-visible:underline! hover:bg-black hover:text-white! hover:underline!"
      {...otherProps}
    >
      {children}
    </Link>
  );
};

export default MenuLink;
