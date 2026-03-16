import supabase from './_supabase.js';
import nodemailer from 'nodemailer';

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
    .select('id, name, email, role')
    .eq('id', session.user_id)
    .single();
  return user;
}

function isRealPassword(val) {
  return val && val.length > 8 && !val.startsWith('SET_');
}

async function sendReviewEmail({ userName, userEmail, rating, comment }) {
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const gmailUser = process.env.GMAIL_USER || 'sangamkhmw@gmail.com';

  if (!isRealPassword(appPassword)) {
    console.log('[Email] GMAIL_APP_PASSWORD not configured — skipping email send.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: appPassword },
    });

    const stars = '⭐'.repeat(rating);
    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0600;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" style="background:#1a0a00;border-radius:16px;overflow:hidden;border:1px solid #92400e;">
        <!-- Header -->
        <tr>
          <td style="background:#f59e0b;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#1a0a00;font-size:32px;font-weight:900;">☕ CafeHub</h1>
            <p style="margin:6px 0 0;color:#1a0a00;font-size:14px;font-weight:600;">New Customer Review Received</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#f59e0b;margin:0 0 24px;font-size:22px;">⭐ New Review Alert</h2>
            <table width="100%" style="border-collapse:collapse;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;color:#fbbf24;font-weight:700;width:130px;">Customer</td>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;color:#fef3c7;">${userName}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;color:#fbbf24;font-weight:700;">Email</td>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;color:#fef3c7;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;color:#fbbf24;font-weight:700;">Rating</td>
                <td style="padding:12px 0;border-bottom:1px solid #2a1500;font-size:22px;">${stars} <span style="color:#fef3c7;font-size:16px;">(${rating}/5)</span></td>
              </tr>
            </table>
            <div style="background:#2a1500;border-left:4px solid #f59e0b;padding:20px;border-radius:0 12px 12px 0;">
              <p style="margin:0 0 8px;color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Review Comment</p>
              <p style="margin:0;color:#fef3c7;font-size:16px;line-height:1.6;font-style:italic;">&ldquo;${comment}&rdquo;</p>
            </div>
            <p style="color:#92400e;font-size:12px;margin-top:28px;">
              Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })} IST
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0f0600;padding:20px 32px;border-top:1px solid #2a1500;text-align:center;">
            <p style="margin:0;color:#92400e;font-size:12px;">CafeHub Admin Notifications · <a href="https://cafehub-app.designarena.ai" style="color:#f59e0b;">Visit CafeHub</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"CafeHub Reviews" <${gmailUser}>`,
      to: 'sangamkhmw@gmail.com',
      subject: `${stars} New ${rating}-Star Review from ${userName} — CafeHub`,
      html,
      text: `New Review\nFrom: ${userName} (${userEmail})\nRating: ${rating}/5\nComment: ${comment}`,
    });
    console.log('[Email] Review notification sent to sangamkhmw@gmail.com');
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    // Don't throw — email failure must not break the review submission
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUser(token);
    if (!user) return res.status(401).json({ error: 'Please login to submit a review' });

    if (req.method === 'POST') {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      if (!comment || comment.trim().length < 3)
        return res.status(400).json({ error: 'Please write a comment (at least 3 characters)' });

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          user_name: user.name,
          rating: parseInt(rating),
          comment: comment.trim(),
          approved: true,
        })
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget email — never blocks the response
      sendReviewEmail({
        userName: user.name,
        userEmail: user.email,
        rating: parseInt(rating),
        comment: comment.trim(),
      });

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { id } = req.body;
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews error:', err);
    return res.status(500).json({ error: err.message });
  }
}
