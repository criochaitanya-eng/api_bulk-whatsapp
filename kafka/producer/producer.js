import kafka from "../connection/connect.js";

const producer = kafka.producer();

let isConnected = false;

// ✅ Ensure Kafka connection
async function ensureConnection() {
  if (!isConnected) {
    await producer.connect();

    isConnected = true;

    console.log("🚀 Kafka Producer Connected");
  }
}

// ✅ Send Campaign Job
export async function sendToKafka(payload) {
  try {
    // ✅ Validate payload
    if (!payload || !payload.campaignId || !payload.contactFileUrl) {
      throw new Error("Invalid campaign payload");
    }

    // ✅ Ensure producer connected
    await ensureConnection();

    // ✅ Send to Kafka
    await producer.send({
      topic: "whatsapp-campaign-topic",

      messages: [
        {
          key: payload.campaignId,

          value: JSON.stringify({
            campaignId: payload.campaignId,
            userId: payload.userId,
            contactFileUrl: payload.contactFileUrl,
            templateName: payload.templateName,
            mediaUrl: payload.mediaUrl,
          }),
        },
      ],
    });

    console.log(`✅ payload from queued: ${payload}`);
  } catch (error) {
    console.error("❌ Kafka Producer Error:", error.message);
    throw error;
  }
}
