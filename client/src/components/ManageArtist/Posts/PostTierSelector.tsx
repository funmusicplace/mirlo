import { moneyDisplay } from "components/common/Money";
import FilterGroup from "components/Profile/UserNotificationFeed/FilterGroup";
import React from "react";
import { useTranslation } from "react-i18next";

type Preset = "all" | "paid" | "free" | "custom";

const tierIds = (tiers: ArtistSubscriptionTier[]) =>
  tiers.map((tier) => `${tier.id}`);

const presetFor = (
  value: string[],
  paidIds: string[],
  freeIds: string[]
): Preset => {
  if (value.length === 0) {
    return "all";
  }
  const sorted = [...value].sort().join(",");
  if (paidIds.length > 0 && sorted === [...paidIds].sort().join(",")) {
    return "paid";
  }
  if (freeIds.length > 0 && sorted === [...freeIds].sort().join(",")) {
    return "free";
  }
  return "custom";
};

const PostTierSelector: React.FC<{
  tiers: ArtistSubscriptionTier[];
  value: string[];
  onChange: (value: string[]) => void;
  currency?: string;
}> = ({ tiers, value, onChange, currency }) => {
  const { t } = useTranslation("translation", { keyPrefix: "postForm" });
  const allIds = tierIds(tiers);
  const paidIds = tierIds(tiers.filter((tier) => !tier.isDefaultTier));
  const freeIds = tierIds(tiers.filter((tier) => tier.isDefaultTier));

  const normalize = (ids: string[]) =>
    allIds.every((id) => ids.includes(id)) ? [] : ids;
  const selected = normalize(value);

  const isChecked = (id: string) =>
    selected.length === 0 || selected.includes(id);
  const checkedCount = selected.length === 0 ? allIds.length : selected.length;

  const toggle = (id: string) => {
    const current = selected.length === 0 ? allIds : selected;
    onChange(
      normalize(
        current.includes(id)
          ? current.filter((other) => other !== id)
          : [...current, id]
      )
    );
  };

  const presets = [
    { value: "all", label: t("audienceAll") },
    ...(paidIds.length > 0 && freeIds.length > 0
      ? [
          { value: "paid", label: t("audiencePaid") },
          { value: "free", label: t("audienceFree") },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <FilterGroup
        legend={t("audienceLegend")}
        name="post-audience"
        options={presets}
        value={presetFor(selected, paidIds, freeIds)}
        onChange={(preset) =>
          onChange(
            preset === "paid"
              ? normalize(paidIds)
              : preset === "free"
                ? normalize(freeIds)
                : []
          )
        }
        noMargin
      />
      <div className="border border-(--mi-darken-xx-background-color) rounded divide-y divide-(--mi-darken-xx-background-color)">
        {tiers.map((tier) => {
          const id = `${tier.id}`;
          const checked = isChecked(id);
          return (
            <label
              key={tier.id}
              htmlFor={`subscription-tier-${tier.id}`}
              className="flex items-center gap-3 p-2 hover:backdrop-brightness-90 font-normal! cursor-pointer mb-0!"
            >
              <input
                id={`subscription-tier-${tier.id}`}
                type="checkbox"
                checked={checked}
                disabled={checked && checkedCount === 1}
                onChange={() => toggle(id)}
                className="w-4 h-4 m-0! cursor-pointer"
              />
              <span className="flex-1 truncate">{tier.name}</span>
              <span className="text-sm text-(--mi-secondary-text-color)">
                {tier.isDefaultTier || !tier.minAmount
                  ? t("free")
                  : moneyDisplay({ amount: tier.minAmount / 100, currency })}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PostTierSelector;
