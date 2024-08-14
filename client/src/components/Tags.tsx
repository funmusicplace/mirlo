import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";

const pageSize = 20;

const Tags = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize });

  const { data: tags } = useQuery(
    queryTags({ skip: pageSize * page, take: pageSize, orderBy: "count" })
  );

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      {" "}
      <SectionHeader>
        <WidthContainer variant="big">
          <h2 className="h5 section-header__heading">{t("popularTags")}</h2>
          <div
            className={css`
              margin: 0 0.5rem;
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
