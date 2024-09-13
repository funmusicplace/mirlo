import React from "react";
import { useParams } from "react-router-dom";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { bp } from "../../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryManagedArtistMerch } from "queries";
import { NewMerchButton } from "./NewMerchButton";
import { ButtonLink } from "components/common/Button";
import { FaPen } from "react-icons/fa";
import DashedList from "./DashedList";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

const ManageMerch: React.FC<{}> = () => {
  const { artistId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: merch, isLoading } = useQuery(
    queryManagedArtistMerch({ artistId: Number(artistId) })
  );

  if (isLoading || isLoadingArtist) {
    return <LoadingBlocks />;
  }

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 1rem;

          @media screen and (max-width: ${bp.medium}px) {
            padding-top: 0.5rem;
          }
        `}
      >
        <SpaceBetweenDiv>
          <div />
          <NewMerchButton artist={artist} />
        </SpaceBetweenDiv>
      </div>
      <DashedList>
        {artist &&
          merch?.results.map((item) => (
            <li key={item.id}>
              <div
                className={css`
                  display: flex;
                  align-items: center;

                  > span {
                    margin-left: 1rem;
                  }
                `}
              >
                <ImageWithPlaceholder
                  src={item.images?.[0]?.sizes?.[60]}
                  alt={item.title}
                  size={60}
                  square
                />
                <span>{item.title}</span>
              </div>
              <ButtonLink to={item.id} startIcon={<FaPen />} />
            </li>
          ))}
      </DashedList>
    </ManageSectionWrapper>
  );
};

export default ManageMerch;
