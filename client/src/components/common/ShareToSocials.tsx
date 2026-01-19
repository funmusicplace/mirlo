import { useState } from "react";
import Button, { ButtonAnchor } from "./Button";
import { FaFacebook, FaShareAlt } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { MdEmail } from "react-icons/md";
import { FaBluesky, FaX, FaXTwitter } from "react-icons/fa6";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  twitterHandle?: string;
}

export default function SocialShare({
  url,
  title,
  description,
  twitterHandle,
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", {
    keyPrefix: "share",
  });

  const socials = [
    {
      name: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
      icon: <FaBluesky />,
    },
    {
      name: "Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}${twitterHandle ? `&via=${twitterHandle}` : ""}`,
      icon: <FaXTwitter />,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: <FaFacebook />,
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description || title)}\n\n${url}`,
      icon: <MdEmail />,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {socials.map((social) => (
        <ButtonAnchor
          startIcon={social.icon}
          href={social.href}
          className="px-3 py-2"
        />
      ))}
      <Button
        onClick={handleCopyLink}
        variant="outlined"
        className="px-3 py-2 text-sm"
      >
        {copied ? t("copied") : t("copyLink")}
      </Button>
    </div>
  );
}
