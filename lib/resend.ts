import nodemailer from 'nodemailer';

function createTransport() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

export async function sendInvitationEmail({
    email,
    inviterName,
    tenantName,
    role,
    token,
}: {
    email: string;
    inviterName: string;
    tenantName: string;
    role: string;
    token: string;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/invite/${token}`;

    try {
        const transporter = createTransport();
        const data = await transporter.sendMail({
            from: `ITAM <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `You have been invited to join ${tenantName} on ITAM`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">Welcome to ITAM</h2>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join the team <strong>${tenantName}</strong> on ITAM as a <strong>${role}</strong>.</p>
          <div style="margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p>This link will expire in 7 days.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 12px; color: #6b7280;">If you're having trouble clicking the button, copy and paste this link into your browser:<br/>${inviteLink}</p>
        </div>
      `,
        });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send invitation email:', error);
        return { success: false, error };
    }
}

export async function sendRequestNotificationEmail({
    type,
    emails,
    toolName,
    requesterName = '',
    reason = '',
    reviewerNote = '',
}: {
    type: 'submitted' | 'approved' | 'rejected' | 'revoked';
    emails: string[];
    toolName: string;
    requesterName?: string;
    reason?: string;
    reviewerNote?: string;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const requestsLink = `${appUrl}/dashboard/requests`;

    let subject = '';
    let htmlContent = '';

    if (type === 'submitted') {
        subject = `New access request: ${toolName}`;
        htmlContent = `<p><strong>${requesterName}</strong> has requested access to <strong>${toolName}</strong>.</p>
      ${reason ? `<p>Reason: "<em>${reason}</em>"</p>` : ''}
      <p><a href="${requestsLink}">View Request</a></p>`;
    } else if (type === 'approved') {
        subject = `Your request for ${toolName} was approved`;
        htmlContent = `<p>Your request for <strong>${toolName}</strong> was approved.</p>
      ${reviewerNote ? `<p>Note: "<em>${reviewerNote}</em>"</p>` : ''}
      <p><a href="${requestsLink}">View Request</a></p>`;
    } else if (type === 'rejected') {
        subject = `Your request for ${toolName} was rejected`;
        htmlContent = `<p>Your request for <strong>${toolName}</strong> was rejected.</p>
      ${reviewerNote ? `<p>Note: "<em>${reviewerNote}</em>"</p>` : ''}`;
    } else if (type === 'revoked') {
        subject = `Your access to ${toolName} has been revoked`;
        htmlContent = `<p>Your access to <strong>${toolName}</strong> has been revoked.</p>
      ${reviewerNote ? `<p>Note: "<em>${reviewerNote}</em>"</p>` : ''}`;
    }

    if (emails.length === 0) return { success: true };

    try {
        const transporter = createTransport();
        const data = await transporter.sendMail({
            from: `ITAM <${process.env.GMAIL_USER}>`,
            to: emails.join(', '),
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">${htmlContent}</div>`,
        });
        return { success: true, data };
    } catch (error) {
        console.error(`Failed to send ${type} email:`, error);
        return { success: false, error };
    }
}

export async function sendPaymentReceiptEmail({
    email,
    plan,
    amount,
    currency,
    orderId,
    paymentId,
    tenantName,
}: {
    email: string;
    plan: 'pro' | 'enterprise';
    amount: number;
    currency: string;
    orderId: string;
    paymentId: string;
    tenantName: string;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const planLink = `${appUrl}/dashboard/plan`;
    const amountValue = Number.isFinite(amount) ? amount : 0;
    const amountText = currency === 'INR'
        ? `₹${(amountValue / 100).toFixed(2)}`
        : `${(amountValue / 100).toFixed(2)} ${currency}`;
    const planLabel = plan === 'pro' ? 'Pro' : 'Enterprise';

    try {
        const transporter = createTransport();
        const data = await transporter.sendMail({
            from: `ITAM <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `Payment receipt for ITAM ${planLabel} plan`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">Payment receipt</h2>
          <p>Thank you for upgrading <strong>${tenantName}</strong> to the <strong>${planLabel}</strong> plan.</p>
          <div style="margin: 20px 0; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="margin: 4px 0;"><strong>Amount:</strong> ${amountText}</p>
            <p style="margin: 4px 0;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 4px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
          </div>
          <p>You can view your plan details here: <a href="${planLink}">${planLink}</a></p>
          <p style="font-size: 12px; color: #6b7280;">If you did not request this payment, please contact support.</p>
        </div>
      `,
        });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send payment receipt email:', error);
        return { success: false, error };
    }
}
