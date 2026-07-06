import useAdminFilters from "components/Admin/useAdminFilters";
import Button from "components/common/Button";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { FaCheck, FaDollarSign, FaEdit } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "services/api";
import usePagination from "utils/usePagination";

import CreatePurchaseModal from "./CreatePurchaseModal";

const pageSize = 100;

export const Index: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = React.useState<TrackGroup[]>([]);
  const [purchaseTrackGroup, setPurchaseTrackGroup] =
    React.useState<TrackGroup | null>(null);
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
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="compact"
                      startIcon={<FaDollarSign />}
                      title="Add purchase for users"
                      onClick={() => setPurchaseTrackGroup(trackgroup)}
                    />
                    <Button
                      size="compact"
                      startIcon={<FaEdit />}
                      onClick={() => onClickQueue(trackgroup.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <PaginationComponent amount={results.length} />
      <CreatePurchaseModal
        trackGroup={purchaseTrackGroup}
        onClose={() => setPurchaseTrackGroup(null)}
      />
    </WidthContainer>
  );
};

export default Index;
