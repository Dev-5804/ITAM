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
