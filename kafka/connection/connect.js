import { Kafka } from "kafkajs";

const kafka = new Kafka({
  brokers: ["localhost:9092"], 
  clientId: "whatsapp-bulk",
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

export default kafka;