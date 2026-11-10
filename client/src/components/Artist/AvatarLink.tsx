import Avatar from "components/Artist/Avatar";
import React from "react";
import { Link } from "react-router-dom";

const AvatarLink: React.FC<{
  avatar?: string;
  name?: string;
  to: string;
}> = ({ avatar, name, to }) => (
  <Link to={to} className="flex items-center gap-1 [&_img]:max-w-[25px]">
    <Avatar avatar={avatar} alt="" /> <span>{name}</span>
  </Link>
);

export default AvatarLink;
