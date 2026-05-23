import kafka from "../connection/connect.js";

import { Worker } from "worker_threads";

import path from "path";
import { fileURLToPath } from "url";

import fetch from "node-fetch";

import fs from "fs";

// ======================================================
// 🔥 Kafka Consumer
// ======================================================

const consumer = kafka.consumer({
  groupId: "campaign-group",
});

const NUM_WORKERS = 4;

const workers = [];

// ======================================================
// 🔥 Worker Path
// ======================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const workerPath = path.join(__dirname, "../../worker/worker.js");

// ======================================================
// 🔥 Create Workers
// ======================================================

function createWorkers() {
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = new Worker(workerPath, {
      workerData: {
        ACCESS_TOKEN: process.env.ACCESS_TOKEN,
      },
    });

    worker.on("message", (msg) => {
      if (!msg.success) {
        console.log(`❌ Worker Failed → ${msg.phone}`);
      } else {
        console.log(`✅ Sent → ${msg.phone}`);
      }
    });

    worker.on("error", (err) => {
      console.log("❌ Worker Error:", err);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.log(`❌ Worker stopped with exit code ${code}`);
      }
    });

    workers.push(worker);
  }
}

// ======================================================
// 🔥 Round Robin Distribution
// ======================================================

let index = 0;

function getWorker() {
  const worker = workers[index];

  index = (index + 1) % workers.length;

  return worker;
}

// ======================================================
// 🔥 Download File
// ======================================================

async function downloadFile(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to download file");
  }

  const fileStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);

    response.body.on("error", reject);

    fileStream.on("finish", resolve);
  });
}

// ======================================================
// 🔥 Parse VCF
// ======================================================

function parseVCF(raw) {
  const contacts = [];

  const cards = raw.split("END:VCARD");

  cards.forEach((card) => {
    const nameMatch = card.match(/FN:(.+)/);

    const phoneMatch = card.match(/TEL.*:(.+)/);

    if (phoneMatch) {
      const phone = phoneMatch?.[1]?.replace(/\D/g, "")?.trim();

      if (!phone) return;

      contacts.push({
        name: nameMatch?.[1]?.trim() || "Customer",

        phone,
      });
    }
  });

  return contacts;
}

// ======================================================
// 🔥 Start Consumer
// ======================================================

export async function startConsumer() {
  await consumer.connect();

  console.log("📥 Campaign Consumer Connected");

  await consumer.subscribe({
    topic: "whatsapp-campaign-topic",

    fromBeginning: false,
  });

  createWorkers();

  await consumer.run({
    partitionsConsumedConcurrently: 4,

    eachMessage: async ({ message }) => {
      try {
        if (!message?.value) return;

        const data = JSON.parse(message.value.toString());

        console.log(
          `🚀 Processing Campaign → ${data.campaignId}`
        );

        // ======================================================
        // 🔥 Create Temp Directory
        // ======================================================

        const tempDir = path.join(process.cwd(), "temp");

        fs.mkdirSync(tempDir, {
          recursive: true,
        });

        // ======================================================
        // 🔥 Temp File Path
        // ======================================================

        const tempFile = path.join(
          tempDir,
          `${data.campaignId}.vcf`
        );

        // ======================================================
        // 🔥 Download File
        // ======================================================

        await downloadFile(data.contactFileUrl, tempFile);

        console.log(`📥 File Downloaded → ${tempFile}`);

        // ======================================================
        // 🔥 Read File
        // ======================================================

        const raw = fs.readFileSync(tempFile, "utf-8");

        // ======================================================
        // 🔥 Parse Contacts
        // ======================================================

        const contacts = parseVCF(raw);

        console.log(
          `📦 Total Contacts Found → ${contacts.length}`
        );

        // ======================================================
        // 🔥 Send Contacts To Workers
        // ======================================================

        for (const contact of contacts) {
          const worker = getWorker();

          worker.postMessage({
            campaignId: data.campaignId,

            userId: data.userId,

            customer: contact,

            templateName: data.templateName,

            variables: data.variables || [],

            languageCode: data.languageCode || "en",

            mediaUrl: data.mediaUrl,

            phoneNumberId: data.phoneNumberId,
          });
        }

        // ======================================================
        // 🔥 Campaign Completed
        // ======================================================

        console.log(
          `✅ Campaign Processing Completed → ${data.campaignId}`
        );

        // ======================================================
        // 🔥 Delete Temp File
        // ======================================================

        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);

          console.log(
            `🗑 Temp File Deleted → ${tempFile}`
          );
        }
      } catch (err) {
        console.log("❌ Consumer Error:", err.message);
      }
    },
  });
}