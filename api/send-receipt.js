import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import sgMail from '@sendgrid/mail';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  const { txn_id, device_id, email } = req.method === 'POST' ? req.body : req.query;

  if (!txn_id || !device_id) {
    return res.status(400).json({ error: 'Missing txn_id or device_id' });
  }

  try {
    const receiptRef = db.collection('receipts').doc(txn_id);
    const receiptDoc = await receiptRef.get();

    if (!receiptDoc.exists) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptDoc.data();
    const deviceRef = db.collection('devices').doc(device_id);

    if (req.method === 'POST' && email) {
      await deviceRef.set({ email, last_used: new Date() });
      await sendEmail(email, receipt);
      return res.json({ message: 'Email sent to new email' });
    }

    const deviceDoc = await deviceRef.get();
    if (deviceDoc.exists && deviceDoc.data().email) {
      const savedEmail = deviceDoc.data().email;
      await sendEmail(savedEmail, receipt);
      return res.json({ receipt, emailSent: true });
    }

    return res.json({ receipt, emailSent: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendEmail(to, receipt) {
  await sgMail.send({
    to,
    from: 'fordify@outlook.com',
    subject: `Your Receipt from ${receipt.store}`,
    text: `Total: £${receipt.total}\nItems:\n${receipt.items.map(item => `- ${item}`).join('\n')}`,
  });
}
