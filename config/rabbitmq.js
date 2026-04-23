const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  channel = await connection.createChannel();

  console.log("✅ RabbitMQ connected");
  return channel;
}

module.exports = { connectRabbitMQ };
