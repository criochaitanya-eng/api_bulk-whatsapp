import fs from "fs";

export function vcfToJson(filePath) {
  const file = fs.readFileSync(filePath, "utf-8");

  const cards = file.split("BEGIN:VCARD").slice(1);

  const results = [];

  for (const card of cards) {
    const block = card.split("END:VCARD")[0];

    const fnMatch = block.match(/FN:(.+)/);
    const telMatch = block.match(/TEL[^:]*:(.+)/);

    // 🔥 extract waid from TEL line
    const waidMatch = block.match(/waid=(\d+)/);

    const waid = waidMatch?.[1];
    const tel = telMatch?.[1];

    const phone =
      waid ||
      normalize(tel) ||
      null;

    if (!phone) continue;

    results.push({
      name: fnMatch?.[1]?.trim() || "unknown",
      phone,
    });
  }

  return results;
}

function normalize(num) {
  if (!num) return null;

  num = num.replace(/\D/g, "");

  // remove leading country logic safety
  if (num.length === 10) return "91" + num;

  return num;
}