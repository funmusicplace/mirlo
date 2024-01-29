import { css } from "@emotion/css";
import LinkWithIcon from "components/common/LinkWithIcon";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

const usePagination = ({ pageSize }: { pageSize: number }) => {
  const [search] = useSearchParams();

  const pageSearch = search.get("page");
  const page = pageSearch ? +pageSearch : 0;

  return {
    page,
    PaginationComponent: ({ amount }: { amount: number }) => (
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: center;
          flex-direction: row;
          flex-wrap: wrap;
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        {page > 0 && (
          <LinkWithIcon to={`?page=${page - 1}`}>
            <FaChevronLeft /> Previous page
          </LinkWithIcon>
        )}
        {page > 0 && amount === pageSize && <> - </>}
        {amount === pageSize && (
          <LinkWithIcon to={`?page=${page + 1}`}>
            Next page <FaChevronRight />
          </LinkWithIcon>
        )}
      </div>
    ),
  };
};

export default usePagination;
