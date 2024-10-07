import React from 'react';

interface Subscriber {
  id: string;
  name: string;
  email: string;
}

interface SubscribersTableProps {
  subscribers: Subscriber[];
}

const SubscribersTable: React.FC<SubscribersTableProps> = ({ subscribers }) => {
  return (
    <table>
      <caption>List of Subscribers</caption>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        {subscribers.map((sub) => (
          <tr key={sub.id}>
            <td>{sub.name}</td>
            <td>{sub.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SubscribersTable;