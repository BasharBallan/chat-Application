const { connectRabbitMQ } = require("../config/rabbitmq");

const EMAIL_QUEUE = "emailQueue";

async function sendEmailJob(payload) {
  const channel = await connectRabbitMQ();

  await channel.assertQueue(EMAIL_QUEUE, { durable: true });

  channel.sendToQueue(
    EMAIL_QUEUE,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );

  console.log("📨 Email job sent:", payload);
}

module.exports = { sendEmailJob };
