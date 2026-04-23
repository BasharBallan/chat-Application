// workers/emailWorker.js
const { connectRabbitMQ } = require("../config/rabbitmq");
const sendEmail = require("../utils/sendEmail"); 

const EMAIL_QUEUE = "emailQueue";

(async () => {
  const channel = await connectRabbitMQ();

  await channel.assertQueue(EMAIL_QUEUE, { durable: true });

  console.log("👷 Email worker listening...");

  channel.consume(EMAIL_QUEUE, async (msg) => {
    const data = JSON.parse(msg.content.toString());

    try {
      console.log("Processing email job:", data);

      await sendEmail({
        email: data.email,
        subject: data.subject,
        html: data.html,
      });

      console.log("✅ Email sent");
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Email failed:", err.message);
      channel.ack(msg);
    }
  });
})();
