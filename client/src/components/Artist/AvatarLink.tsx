import Avatar from "components/Artist/Avatar";
import React from "react";
import { Link } from "react-router-dom";

const AvatarLink: React.FC<{
  avatar?: string;
  name?: string;
  to: string;
}> = ({ avatar, name, to }) => (
  <Link to={to} className="flex items-center gap-1">
    <span className="w-6 shrink-0">
      <Avatar avatar={avatar} alt="" />
    </span>{" "}
    <span>{name}</span>
  </Link>
);

export default AvatarLink;
