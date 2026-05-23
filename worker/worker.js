import { parentPort , workerData } from "worker_threads";
import dotenv from "dotenv";

dotenv.config();

const DELAY = 100; // 10 msg/sec
const MAX_RETRIES = 3;

// const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// if (!WHATSAPP_TOKEN) {
//   throw new Error("❌ WHATSAPP_TOKEN missing in .env");
// }
const ACCESS_TOKEN = workerData.ACCESS_TOKEN;
const queue = [];
let processing = false;

// ======================================================
// 🔥 HELPERS
// ======================================================

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔥 Normalize Phone
function normalizePhone(phone) {
  if (!phone) return null;

  phone = String(phone).replace(/\D/g, "");

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  if (phone.length !== 12 || !phone.startsWith("91")) {
    return null;
  }

  return phone;
}

// 🔥 Build Dynamic Parameters
function buildTemplateParameters(customer, variables = []) {
  return variables.map((field) => ({
    type: "text",

    text: String(customer[field] ?? "N/A"),
  }));
}

// ======================================================
// 🔥 WHATSAPP SENDER
// ======================================================

async function sendWhatsApp({
  customer,
  templateName,
  variables = [],
  mediaUrl = "https://res.cloudinary.com/dp8evydam/image/upload/v1779093181/bazar.sh_social_png_y02evy.png",
  languageCode = "en",
  phoneNumberId = "1105448202640871",
}) {
  try {
    // 🔥 Validate phone number ID
    if (!phoneNumberId) {
      return {
        success: false,
        error: "Missing phoneNumberId",
      };
    }

    // 🔥 Validate template name
    if (!templateName) {
      return {
        success: false,
        error: "Missing templateName",
      };
    }

    // 🔥 Normalize phone
    const formattedPhone = normalizePhone(customer.phone);

    if (!formattedPhone) {
      return {
        success: false,
        error: "Invalid phone number",
      };
    }

    // 🔥 Build body parameters
    const bodyParameters = buildTemplateParameters(customer, variables);

    // 🔥 Components
    const components = [];

    // 🔥 IMAGE HEADER
    if (mediaUrl) {
      components.push({
        type: "header",

        parameters: [
          {
            type: "image",

            image: {
              link: mediaUrl,
            },
          },
        ],
      });
    }

    // 🔥 BODY VARIABLES
    if (bodyParameters.length > 0) {
      components.push({
        type: "body",

        parameters: bodyParameters,
      });
    }

    // ======================================================
    // 🔥 API CALL
    // ======================================================

    console.log(
      "log from worker ",
      "template name ",
      templateName,
      "phone numberId",
      phoneNumberId,
      "imageurl",
      mediaUrl,
    );

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messaging_product: "whatsapp",

          to: formattedPhone,

          type: "template",

          template: {
            name: templateName,

            language: {
              code: "en",
            },

            components,
          },
        }),
      },
    );

    const data = await response.json();

    // ======================================================
    // 🔥 API ERROR
    // ======================================================
    if (!response.ok) {
      return {
        success: false,

        phone: formattedPhone,

        error: data.error?.message || "WhatsApp API Error",
      };
    }

    console.log(data);
    return {
      success: true,

      phone: formattedPhone,

      messageId: data.messages?.[0]?.id || null,
    };
  } catch (err) {
    return {
      success: false,

      error: err.message,
    };
  }
}

async function sendWithRetry(data) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const result = await sendWhatsApp(data);

    if (result.success) {
      return result;
    }

    attempt++;

    console.log(`⚠️ Retry ${attempt}/${MAX_RETRIES} → ${data.customer.phone}`);

    // 🔥 Exponential backoff
    await delay(attempt * 1000);
  }

  return {
    success: false,

    phone: data.customer.phone,

    error: "Max retries reached",
  };
}

async function processQueue() {
  if (processing) return;

  processing = true;

  try {
    while (queue.length > 0) {
      const data = queue.shift();

      try {
        console.log(`📩 Sending → ${data.customer.phone}`);

        const result = await sendWithRetry(data);

        // 🔥 Send result to consumer
        parentPort.postMessage({
          success: result.success,

          campaignId: data.campaignId,

          phone: result.phone,

          messageId: result.messageId,

          error: result.error,
        });

        // 🔥 Rate limit
        await delay(DELAY);
      } catch (err) {
        parentPort.postMessage({
          success: false,

          campaignId: data.campaignId,

          phone: data.customer.phone,

          error: err.message,
        });
      }
    }
  } finally {
    processing = false;
  }
}

parentPort.on("message", (data) => {
  queue.push(data);

  if (!processing) {
    processQueue();
  }
});
