import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { txn_id, device_id, store, total, items } = req.body;

  if (!txn_id || !device_id || !store || !total || !items) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.collection('receipts').doc(txn_id).set({ store, total, items });
    await db.collection('devices').doc(device_id).set({ last_used: new Date() });
    return res.json({ message: 'Receipt stored' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to store receipt' });
  }
}
