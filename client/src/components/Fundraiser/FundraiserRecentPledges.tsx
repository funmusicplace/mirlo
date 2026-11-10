import { moneyDisplay } from "components/common/Money";
import { toLanguageTag } from "i18n";
import React from "react";
import { useTranslation } from "react-i18next";

export const NEWEST_PLEDGE_DELAY = 5000;
export const PLEDGE_CYCLE_INTERVAL = 3000;

const timeUnits = [
  { unit: "year", seconds: 365 * 24 * 60 * 60 },
  { unit: "week", seconds: 7 * 24 * 60 * 60 },
  { unit: "day", seconds: 24 * 60 * 60 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
] as const;

export const formatShortTimeAgo = (date: string, language?: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  const { unit, seconds: unitSeconds } = timeUnits.find(
    (u) => seconds >= u.seconds
  ) ?? { unit: "minute", seconds: 60 };
  return new Intl.NumberFormat(toLanguageTag(language), {
    style: "unit",
    unit,
    unitDisplay: "narrow",
  }).format(Math.floor(seconds / unitSeconds));
};

const pledgeAmount = (
  pledge: PublicFundraiser["recentPledges"][number],
  currency?: string
) =>
  moneyDisplay({
    amount: pledge.amount / 100,
    currency,
    options: { trailingZeroDisplay: "stripIfInteger" },
  });

const PledgeTimeAgo: React.FC<{
  pledge: PublicFundraiser["recentPledges"][number];
}> = ({ pledge }) => {
  const { i18n } = useTranslation();
  return (
    <span className="shrink-0 whitespace-nowrap text-xs text-(--mi-secondary-text-color) opacity-70">
      {formatShortTimeAgo(pledge.createdAt, i18n.resolvedLanguage)}
    </span>
  );
};

const PledgeLine: React.FC<{
  pledge: PublicFundraiser["recentPledges"][number];
  currency?: string;
}> = ({ pledge, currency }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserPage",
  });
  return (
    <>
      <span className="flex flex-col">
        <span className="text-sm">{t("someonePledged")}</span>
        <span className="font-bold">{pledgeAmount(pledge, currency)}</span>
      </span>
      <PledgeTimeAgo pledge={pledge} />
    </>
  );
};

const lineClass = "flex items-center justify-between gap-2";
const arriveClass = "animate-fade-in-down motion-reduce:animate-none";

const FundraiserRecentPledges: React.FC<{
  pledges: PublicFundraiser["recentPledges"];
  currency?: string;
  className?: string;
}> = ({ pledges, currency, className }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserPage",
  });
  const [newestArrived, setNewestArrived] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(
      () => setNewestArrived(true),
      NEWEST_PLEDGE_DELAY
    );
    return () => clearTimeout(timeout);
  }, []);

  if (pledges.length === 0) {
    return null;
  }

  const shown = newestArrived ? pledges.slice(0, 5) : pledges.slice(1, 6);

  return (
    <section aria-labelledby="fundraiser-recent-pledges" className={className}>
      <h2 id="fundraiser-recent-pledges" className="text-base! mb-2!">
        {t("recentPledges")}
      </h2>
      <ul className="flex flex-col divide-y divide-(--mi-tint-x-color)">
        {shown.map((pledge) => (
          <li
            key={pledge.id}
            className={`${lineClass} py-2 ${
              newestArrived && pledge.id === pledges[0].id ? arriveClass : ""
            }`}
          >
            <PledgeLine pledge={pledge} currency={currency} />
          </li>
        ))}
      </ul>
    </section>
  );
};

export const FundraiserPledgeTicker: React.FC<{
  pledges: PublicFundraiser["recentPledges"];
  currency?: string;
  className?: string;
}> = ({ pledges, currency, className }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserPage",
  });
  const cycled = pledges.slice(0, 5);
  const [index, setIndex] = React.useState(() =>
    Math.floor(Math.random() * cycled.length)
  );

  React.useEffect(() => {
    if (cycled.length < 2) {
      return;
    }
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % cycled.length),
      PLEDGE_CYCLE_INTERVAL
    );
    return () => clearInterval(interval);
  }, [cycled.length]);

  const pledge = cycled[index];
  if (!pledge) {
    return null;
  }

  return (
    <p className={`overflow-hidden ${className ?? ""}`}>
      <span key={pledge.id} className={`${lineClass} ${arriveClass}`}>
        <span>
          {t("someonePledgedAmount", {
            amount: pledgeAmount(pledge, currency),
          })}
        </span>
        <PledgeTimeAgo pledge={pledge} />
      </span>
    </p>
  );
};

export default FundraiserRecentPledges;
