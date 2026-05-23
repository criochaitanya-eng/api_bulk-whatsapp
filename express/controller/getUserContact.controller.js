import { sendToKafka } from "../../kafka/producer/producer.js";

const startCampaign = async (req, res) => {
  try {
    const { campaignId, userId, contactFileUrl, templateName, mediaUrl } =
      req.body;

    // ✅ Validate required fields
    if (!campaignId || !userId || !contactFileUrl) {
      return res.status(400).json({
        success: false,
        msg: "Missing required fields",
      });
    }

    // 🚀 Kafka Payload
    const payload = {
      campaignId,
      userId,
      contactFileUrl,
      templateName,
      mediaUrl,
    };

    console.log("🚀 Before Kafka");

    // 🚀 Send to Kafka
    await sendToKafka(payload);
    console.log("✅ After Kafka");

    console.log("producer payload  =>", payload);

    return res.status(200).json({
      success: true,
      msg: "Campaign queued successfully",
      campaignId,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

export default startCampaign;
