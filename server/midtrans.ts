import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

export const SNAP_API = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export const STATUS_API = (orderId: string) =>
  IS_PRODUCTION
    ? `https://api.midtrans.com/v2/${orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

export const PRICE_IDR = Number(process.env.SUBSCRIPTION_PRICE_IDR || 99000);

export interface CreateSnapResult {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  customerEmail: string;
  customerName: string;
}): Promise<CreateSnapResult> {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error('MIDTRANS_SERVER_KEY is not configured.');
  }

  const res = await fetch(SNAP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64'),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      item_details: [
        {
          id: 'ugc-pro-monthly',
          price: params.grossAmount,
          quantity: 1,
          name: 'UGC Scriptwriter PRO - 1 Bulan',
        },
      ],
      customer_details: {
        email: params.customerEmail,
        first_name: params.customerName,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans Snap error ${res.status}: ${text}`);
  }

  return res.json();
}

export function verifyMidtransSignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  if (!MIDTRANS_SERVER_KEY) return false;
  const expected = crypto
    .createHash('sha512')
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${MIDTRANS_SERVER_KEY}`)
    .digest('hex');
  return expected === body.signature_key;
}
