import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "whatsapp-bulk",
  brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

export default kafka;