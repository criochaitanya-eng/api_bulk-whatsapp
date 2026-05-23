import "./config/env.js";

import express from "express";
import kafka from "./kafka/connection/connect.js";
import getnumber from "./express/route/getUserRoute.route.js";
import { startConsumer } from "./kafka/consumer/consumer.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 API is running");
});

app.use("/api", getnumber);

// ----------------------------
// Kafka Retry Logic (SAFE)
// ----------------------------
async function connectKafkaWithRetry(admin, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await admin.connect();
      console.log("✅ Kafka Admin connected");
      return;
    } catch (err) {
      console.log(`❌ Kafka retry ${i + 1}/${maxRetries}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  throw new Error("❌ Kafka not available after retries");
}

// ----------------------------
// Kafka Init
// ----------------------------
async function initKafka() {
  const admin = kafka.admin();

  try {
    await connectKafkaWithRetry(admin);

    const topics = await admin.listTopics();

    if (!topics.includes("whatsapp-send")) {
      await admin.createTopics({
        topics: [
          {
            topic: "whatsapp-send",
            numPartitions: 4,
            replicationFactor: 1,
          },
        ],
      });

      console.log("✅ Topic created");
    } else {
      console.log("✅ Topic already exists");
    }
  } catch (err) {
    console.error("❌ Kafka init error:", err.message);
  } finally {
    await admin.disconnect();
  }
}

// ----------------------------
// START APP
// ----------------------------
async function startApp() {
  try {
    await initKafka();

    // IMPORTANT: don’t crash app if consumer fails
    try {
      startConsumer();
      console.log("✅ Consumer started");
    } catch (err) {
      console.error("❌ Consumer failed:", err.message);
    }

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${port}`);
    });

  } catch (err) {
    console.error("❌ App startup failed:", err.message);
    process.exit(1);
  }
}

startApp();