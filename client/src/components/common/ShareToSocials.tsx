import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaCopy, FaFacebook } from "react-icons/fa";
import { FaBluesky, FaMastodon, FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";

import Button, { ButtonAnchor } from "./Button";

type SocialKey = "bluesky" | "x" | "facebook" | "email" | "mastodon";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  twitterHandle?: string;
  socials?: SocialKey[];
}

export default function ShareToSocials({
  url,
  title,
  description,
  twitterHandle,
  socials: socialsFilter = ["bluesky", "x", "facebook", "email"],
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "share" });

  const shareText = `${title} ${url}`;

  const allSocials: Record<
    SocialKey,
    { name: string; href: string; icon: React.ReactElement }
  > = {
    bluesky: {
      name: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`,
      icon: <FaBluesky />,
    },
    x: {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}${twitterHandle ? `&via=${twitterHandle}` : ""}`,
      icon: <FaXTwitter />,
    },
    facebook: {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: <FaFacebook />,
    },
    mastodon: {
      name: "Mastodon",
      href: `https://share.joinmastodon.org/?text=${encodeURIComponent(shareText)}`,
      icon: <FaMastodon />,
    },
    email: {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description || title}\n\n${url}`)}`,
      icon: <MdEmail />,
    },
  };

  const socials = socialsFilter.map((key) => allSocials[key]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {socials.map((social) => (
          <ButtonAnchor
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            startIcon={social.icon}
          />
        ))}
      </div>
      <div className="flex items-stretch gap-2">
        <input
          id="share-url"
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={t("urlToShare") ?? ""}
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-(--mi-darken-background-color) text-(--mi-normal-foreground-color) border border-(--mi-button-color) rounded outline-none"
        />
        <Button
          type="button"
          onClick={handleCopyLink}
          startIcon={copied ? <FaCheck /> : <FaCopy />}
        >
          {copied ? t("copied") : t("copyLink")}
        </Button>
      </div>
    </div>
  );
}
