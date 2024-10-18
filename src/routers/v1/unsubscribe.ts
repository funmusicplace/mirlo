import { Request, Response } from 'express';

export default function(api) {
  return {
    get: async (req: Request, res: Response) => {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Invalid email address.' });
      }

      try {
        // Proceed with the unsubscribe logic using the decoded email
        await unsubscribeUser(email);
        res.status(200).json({ message: 'Successfully unsubscribed.' });
      } catch (error) {
        res.status(500).json({ error: 'Server error.' });
      }
    }
  };
}

async function unsubscribeUser(email: string) {
  // Implement your unsubscribe logic here
  // For example, update the user's subscription status in the database
}