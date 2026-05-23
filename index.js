import "./config/env.js";

import express from "express";
import kafka from "./kafka/connection/connect.js";
import getnumber from "./express/route/getUserRoute.route.js";
import { startConsumer } from "./kafka/consumer/consumer.js";

const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function connectKafkaWithRetry(admin, retries = 5) {
  while (retries) {
    try {
      await admin.connect();
      console.log("✅ Kafka Admin connected");
      return;
    } catch (err) {
      console.log(`❌ Kafka connection failed. Retrying... (${retries})`);
      retries--;
      await new Promise((res) => setTimeout(res, 3000)); // wait 3 sec
    }
  }

  throw new Error("❌ Kafka not available after retries");
}

async function init() {
  const admin = kafka.admin();

  try {
    // 🔥 use retry instead of direct connect
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

      console.log("Topic created ✅");
    } else {
      console.log("Topic already exists ✅");
    }
  } catch (err) {
    console.error("Kafka init error:", err.message);
  } finally {
    await admin.disconnect();
  }
}

app.use(express.json());
app.use("/", getnumber);

// 🔥 START EVERYTHING PROPERLY
async function startApp() {
  await init(); // create topic first

  // 🔥 start consumer (do NOT await)
  startConsumer();

  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startApp();
