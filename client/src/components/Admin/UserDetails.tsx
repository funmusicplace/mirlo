import SectionNav from "components/common/SectionNav";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import api from "services/api";

export const UserDetails: React.FC = () => {
  const { userId } = useParams();

  const [user, setUser] = React.useState<User>();

  const fetchUserWrapper = React.useCallback(async (id: string) => {
    const { result } = await api.get<User>(`users/${id}`);
    setUser(result);
  }, []);

  React.useEffect(() => {
    if (userId) {
      fetchUserWrapper(userId);
    }
  }, [fetchUserWrapper, userId]);

  return (
    <>
      <WidthContainer variant="big" justify="center" className="p-4">
        <h3>User: {user?.name}</h3>
      </WidthContainer>
      <div className="mb-4">
        <SectionNav uppercase={false} transparent>
          <li>
            <NavLink to="">Details</NavLink>
          </li>
          <li>
            <NavLink to="releases">Releases</NavLink>
          </li>
          <li>
            <NavLink to="analytics">Analytics</NavLink>
          </li>
          <li>
            <NavLink to="earnings">Earnings</NavLink>
          </li>
        </SectionNav>
      </div>
      <WidthContainer variant="big" justify="center" className="p-4">
        <Outlet context={[user]} />
      </WidthContainer>
    </>
  );
};

export default UserDetails;
