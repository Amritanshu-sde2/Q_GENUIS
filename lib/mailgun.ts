import { supabase, isSupabaseConfigured, isDemoMode } from './supabase';

export interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from: string;
}

/**
 * Sends an email using Supabase Edge Function 'send-email'.
 * This allows securely sending emails via Mailgun from the backend.
 * 
 * @param to Recipient email
 * @param subject Email subject
 * @param text Email body text
 * @returns Success status object
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<{ success: boolean; error?: any }> => {
  // Skip if running in Demo Mode or if Supabase isn't configured
  if (!isSupabaseConfigured || isDemoMode) {
    console.log("[Mailgun Service] Skipping Edge Function invocation (Demo Mode / No Config)");
    return { success: false, error: "Skipped in demo mode" };
  }

  try {
    console.log(`[Mailgun Service] Invoking 'send-email' Edge Function for ${to}...`);
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, text }
    });

    if (error) {
        throw error;
    }
    
    console.log("[Mailgun Service] Email sent successfully via Edge Function.");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Mailgun Service] Edge Function Failed:", err);
    return { success: false, error: err.message || err };
  }
};

export const sendWelcomeEmail = async (name: string, email: string): Promise<EmailContent> => {
  console.log(`[Mailgun Service] Preparing welcome email for ${email}...`);
  
  const subject = `Welcome to Q-Genius, ${name}! 🚀`;
  const from = "The Q-Genius Team <support@qgenius.com>";
  
  const message = `Welcome to Q-Genius a Sustainable AI-based Question Paper Generator for inclusive learning , ${name}! 👋

Hi ${name},

Welcome to the Q-Genius family! We're thrilled to have you.

You're all set to start our app to create Question paper within its given time period.
👉 Log in now and get started: ${typeof window !== 'undefined' ? window.location.origin : 'https://qgenius.app'}

If you have any questions, just reply to this email—we're here to help!

Happy Creating!

Cheers,

The Q-Genius Team
Regards

Amritanshu Tiwari`;

  // ---------------------------------------------------------------------------
  // EDGE FUNCTION INTEGRATION
  // ---------------------------------------------------------------------------
  // We attempt to send the real email via Supabase Edge Function.
  // If it fails (or if we are in demo mode), we catch the error so the 
  // UI flow continues uninterrupted.
  await sendEmail(email, subject, message);

  // ---------------------------------------------------------------------------
  // UI SIMULATION (Simulated Inbox)
  // ---------------------------------------------------------------------------
  // Return the content so the UI can display the "Simulated Inbox" modal.
  // This ensures the user sees the email immediately in the app for verification.
  return new Promise((resolve) => {
    setTimeout(() => {
        resolve({
            to: email,
            from,
            subject,
            text: message
        });
    }, 800);
  });
};
