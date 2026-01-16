# Transactions

Mirlo stores transactions in a `Transaction` table that links to specific types of transactions through a series of one to many relationships.

![Transactions](./Transaction%20Diagram.png)

We store every charge made to a user's payment method in this table, linking to appropriate types of payments when necessary. This method allows multiple purchases (eg, purchasing of a catalogue) to be tracked for a single transaction.

It also allows for the creation of purchases (or rather, ownership) without transactions.

## Fundraising Pledges

Currently a `Fundraiser` is only related to `TrackGroup`. When a fundraiser pledge is charged, we store a transactionId on the `FundraiserPledge`, as well as linking a `UserTrackGroupPurchase` to that same transaction.
