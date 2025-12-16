export const sendWelcomeEmail = async (name: string, email: string) => {
  console.log(`[Mailgun Mock] Sending email to ${email}...`);
  
  const message = `
  Welcome to Q-Genius a Sustainable AI-based Question Paper Generator for inclusive learning, ${name}! 👋

  Hi ${name},

  Welcome to the Q-Genius family! We're thrilled to have you.

  You're all set to start our app to create Question paper within its given time period.
  👉 Log in now and get started: [Link to App/Login Page]

  If you have any questions, just reply to this email—we're here to help!

  Happy Creating!

  Cheers,
  The Q-Genius Team
  Regards,
  Amritanshu Tiwari
  `;

  // In a real app, this would be a fetch call to a backend endpoint that uses mailgun-js
  // await fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to: email, text: message }) });
  
  return new Promise((resolve) => {
    setTimeout(() => {
        console.log("Email sent successfully!");
        console.log(message);
        resolve(true);
    }, 1000);
  });
};
