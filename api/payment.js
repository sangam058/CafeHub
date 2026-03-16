import supabase from './_supabase.js';
import crypto from 'crypto';

async function getUser(token) {
  if (!token) return null;
  const { data: session } = await supabase
    .from('auth_sessions')
    .select('user_id')
    .eq('id', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (!session) return null;
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role, loyalty_points')
    .eq('id', session.user_id)
    .single();
  return user;
}

function isRealKey(val) {
  return val && val.length > 10 && !val.startsWith('SET_') && !val.startsWith('rzp_test_demo');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { action, amount, payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (action === 'create_order') {
      const KEY_ID = process.env.RAZORPAY_KEY_ID;
      const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

      // Use real Razorpay only if both keys are genuinely configured
      if (isRealKey(KEY_ID) && isRealKey(KEY_SECRET)) {
        const authHeader = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `order_${Date.now()}`,
            notes: { user_id: String(user.id), user_email: user.email },
          }),
        });
        const rzpData = await rzpRes.json();
        if (!rzpRes.ok) throw new Error(rzpData.error?.description || 'Razorpay order creation failed');
        return res.status(200).json({
          id: rzpData.id,
          amount: rzpData.amount,
          currency: rzpData.currency,
          key: KEY_ID,
          demo: false,
        });
      }

      // Demo mode — no real keys
      const orderId = 'order_demo_' + crypto.randomBytes(6).toString('hex');
      return res.status(200).json({
        id: orderId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        key: null,
        demo: true,
      });
    }

    if (action === 'verify') {
      const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
      if (isRealKey(KEY_SECRET) && razorpay_order_id && razorpay_signature) {
        const text = `${razorpay_order_id}|${payment_id}`;
        const expectedSig = crypto
          .createHmac('sha256', KEY_SECRET)
          .update(text)
          .digest('hex');
        if (expectedSig !== razorpay_signature) {
          return res.status(400).json({ error: 'Payment signature verification failed' });
        }
      }
      return res.status(200).json({ verified: true, payment_id });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: err.message });
  }
}
