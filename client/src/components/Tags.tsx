import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";
import SpaceBetweenDiv from "./common/SpaceBetweenDiv";
import Select, { SelectEl } from "./common/Select";
import { useState } from "react";

const pageSize = 200;

const Tags = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [orderBy, setOrderBy] = useState<"count" | "name">("count");

  const { data: tags } = useQuery(
    queryTags({ skip: pageSize * page, take: pageSize, orderBy })
  );

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      <SectionHeader>
        <WidthContainer variant="big">
          <SpaceBetweenDiv>
            <h2 className="h5 section-header__heading">{t("popularTags")}</h2>
            <Select
              options={[
                { label: t("mostPopular"), value: "count" },
                { label: t("alphabetical"), value: "name" },
              ]}
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value as "count" | "name");
              }}
            />
          </SpaceBetweenDiv>
          <div
            className={css`
              margin: 0 0.5rem;

              & > div {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              }
            `}
          >
            <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
          </div>
        </WidthContainer>
      </SectionHeader>
      <div
        className={css`
          padding-top: 0.25rem;
        `}
      >
        <WidthContainer variant="big" justify="center">
          {tags && <PaginationComponent amount={tags.results.length} />}
        </WidthContainer>
      </div>
    </div>
  );
};

export default Tags;
