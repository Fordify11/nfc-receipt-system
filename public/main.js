import { getDeviceId } from './firebase.js';

const params = new URLSearchParams(window.location.search);
const txn_id = params.get("txn_id");
const device_id = getDeviceId();

const API_URL = "/api/sendReceipt"; // Automatically resolved by Vercel

async function loadReceipt() {
  const res = await fetch(`${API_URL}?txn_id=${txn_id}&device_id=${device_id}`);
  const data = await res.json();

  document.getElementById("receipt").textContent = JSON.stringify(data.receipt, null, 2);

  if (data.emailSent) {
    document.getElementById("emailForm").style.display = "none";
    document.getElementById("confirmation").style.display = "block";
  }
}

window.submitEmail = async () => {
  const email = document.getElementById("email").value;

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txn_id, device_id, email })
  });

  document.getElementById("emailForm").style.display = "none";
  document.getElementById("confirmation").style.display = "block";
};

loadReceipt();
