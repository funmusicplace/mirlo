import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ArtistSubscriberDataDownload from "./ArtistSubscriberDataDownload";
import Table from "components/common/Table";
import api from "services/api";
import React from "react";
import { useArtistContext } from "state/ArtistContext";
import { ArtistSection } from "components/Artist/Artist";
import Money from "components/common/Money";
import styled from "@emotion/styled";
import { bp } from "../../constants";

export const SupporterTable = styled(Table)`
  @media screen and (max-width: ${bp.small}px) {
    & td,
    &th {
      max-width: 90px;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
`;

type SupportTier = {
  user: User;
  amount: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
};

const Supporters = () => {
  const {
    state: { artist },
  } = useArtistContext();
  const artistId = artist?.id;
  const userId = artist?.userId;
  const [supporters, setSupporters] = React.useState<SupportTier[]>([]);
  const [followers, setFollowers] = React.useState<SupportTier[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const response = await api.getMany<SupportTier>(
        `users/${userId}/artists/${artistId}/subscribers`
      );

      setSupporters(
        response.results.filter((r) => !r.artistSubscriptionTier.isDefaultTier)
      );
      setFollowers(
        response.results.filter((r) => r.artistSubscriptionTier.isDefaultTier)
      );
    };

    callback();
  }, [userId, artistId]);

  return (
    <>
      <ArtistSection>
        <SpaceBetweenDiv>
          <h4>Supporters</h4>
          <ArtistSubscriberDataDownload />
        </SpaceBetweenDiv>
        <SupporterTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Tier</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {supporters.map((r) => (
              <tr key={r.user.id}>
                <td>{r.user.name}</td>
                <td>{r.user.email}</td>
                <td>{r.artistSubscriptionTier.name}</td>
                <td>
                  <Money
                    amount={r.amount / 100}
                    currency={r.artistSubscriptionTier.currency}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SupporterTable>
      </ArtistSection>
      <ArtistSection>
        <SpaceBetweenDiv>
          <h4>Followers</h4>
        </SpaceBetweenDiv>
        <SupporterTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {followers.map((r) => (
              <tr key={r.user.id}>
                <td>{r.user.name}</td>
                <td>{r.user.email}</td>
              </tr>
            ))}
          </tbody>
        </SupporterTable>
      </ArtistSection>
    </>
  );
};

export default Supporters;
