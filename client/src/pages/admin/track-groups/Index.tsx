import Button from "components/common/Button";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

import useAdminFilters from "components/Admin/useAdminFilters";

const pageSize = 100;

export const Index: React.FC = () => {
  const navigate = useNavigate();
  const { trackgroupId } = useParams();
  const [results, setResults] = React.useState<TrackGroup[]>([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [total, setTotal] = React.useState<number>();
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [searchParams] = useSearchParams();

  const callback = React.useCallback(async () => {
    const params =
      new URLSearchParams(searchParams.toString()) || new URLSearchParams();

    params.append("orderBy", "createdAt");
    params.append("skip", `${pageSize * page}`);
    params.append("take", `${pageSize}`);

    const { results, total: totalReuslts } = await api.getMany<TrackGroup>(
      `admin/trackGroups?${params?.toString()}`
    );
    setResults(results);
    setTotal(totalReuslts);
  }, [searchParams, page]);

  const { Filters } = useAdminFilters({
    onSubmitFilters: callback,
    fields: ["title", "isPublished", "artistName"],
  });

  React.useEffect(() => {
    callback();
  }, [callback]);

  React.useEffect(() => {
    if (trackgroupId) {
      setOpenModal(true);
    }
  }, [trackgroupId]);

  const onClickQueue = React.useCallback(
    (id: number) => {
      navigate(`/admin/track-groups/${id}`);
    },
    [navigate]
  );

  return (
    <WidthContainer variant="big" justify="center" className="p-4 grow">
      <h3>TrackGroups</h3>
      <Filters />
      <h4>Total results: {total}</h4>

      {results.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th />
              <th>Title</th>
              <th>Artist</th>
              <th>Release date</th>
              <th>Created date</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((trackgroup, index) => (
              <tr key={trackgroup.id}>
                <td>{index + 1}</td>
                <td>
                  {trackgroup.title} (id: {trackgroup.id})
                </td>

                <td>{trackgroup.artist?.name}</td>
                <td>{trackgroup.releaseDate}</td>
                <td>{trackgroup.createdAt}</td>
                <td>{trackgroup.publishedAt ? <FaCheck /> : undefined}</td>
                <td className="alignRight">
                  <Button
                    size="compact"
                    startIcon={<FaEdit />}
                    onClick={() => onClickQueue(trackgroup.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
    </WidthContainer>
  );
};

export default Index;
