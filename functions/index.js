const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

// ✅ Use SendGrid key from environment config (see setup step below)
sgMail.setApiKey(functions.config().sendgrid.key);

// 🔧 Main Cloud Function: GET or POST
exports.handleReceipt = functions.https.onRequest(async (req, res) => {
  const { txn_id, device_id, email } = req.method === "POST" ? req.body : req.query;

  if (!txn_id || !device_id) {
    return res.status(400).json({ error: "Missing txn_id or device_id" });
  }

  try {
    const receiptRef = db.collection("receipts").doc(txn_id);
    const deviceRef = db.collection("devices").doc(device_id);

    const receiptDoc = await receiptRef.get();
    if (!receiptDoc.exists) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receipt = receiptDoc.data();

    // POST = save email + send
    if (req.method === "POST" && email) {
      await deviceRef.set({ email, last_used: new Date() });
      await sendEmail(email, receipt);
      await receiptRef.update({
        emailed_to: admin.firestore.FieldValue.arrayUnion(email),
      });
      return res.json({ message: "Receipt sent to new email" });
    }

    // GET = auto-send to saved email if known
    const deviceDoc = await deviceRef.get();
    if (deviceDoc.exists && deviceDoc.data().email) {
      const savedEmail = deviceDoc.data().email;
      await sendEmail(savedEmail, receipt);
      await receiptRef.update({
        emailed_to: admin.firestore.FieldValue.arrayUnion(savedEmail),
      });
      return res.json({ receipt, emailSent: true });
    }

    // No email found yet
    return res.json({ receipt, emailSent: false });

  } catch (error) {
    console.error("Error handling receipt:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 📤 Helper to send email
async function sendEmail(to, receipt) {
  await sgMail.send({
    to,
    from: "fordify@outlook.com",
    subject: `Your Receipt from ${receipt.store}`,
    text: `Thanks for visiting ${receipt.store}!\n\nTotal: £${receipt.total}\nItems:\n${receipt.items.map(i => `- ${i}`).join("\n")}`,
  });
}
