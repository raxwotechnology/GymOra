const crypto = require("crypto");

function md5(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function generatePayhereHash({ merchantId, orderId, amount, currency }) {
  const amountFormatted = Number(amount).toFixed(2);
  const secretHash = md5(process.env.PAYHERE_MERCHANT_SECRET).toUpperCase();
  return md5(`${merchantId}${orderId}${amountFormatted}${currency}${secretHash}`).toUpperCase();
}

// Verifies the IPN POST signature sent by PayHere to the notify_url
function verifyPayhereWebhook(body) {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
  const secretHash = md5(process.env.PAYHERE_MERCHANT_SECRET).toUpperCase();
  const local = md5(
    `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`
  ).toUpperCase();
  return local === md5sig;
}

module.exports = { generatePayhereHash, verifyPayhereWebhook };
