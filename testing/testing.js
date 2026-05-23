import "../config/env.js";

async function sendWhatsApp() {
  console.log(process.env.ACCESS_TOKEN);
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${1105448202640871}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer EAAcAJYsOGrUBRK5X85mjNYM4MbA3jPZAZBPeqmexkvdTz5qdwfZBV8slgFvFXwdKM8bwAO2m8mbA2RxhMydsZBXvKmfousxZCZATUiABD3ocyrpNT1ZA9nDTHnZAMHQhmvZAVxDyi6QzOHqJwmbJvREWkZAaXflaWBIt619232nNcq1qfpwecMw8qjgHU8ILU2abiNEAzlf8sgOqnzlB06CMdKpZATVsFt87FBBgLZBjMB1j`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "919130452737",
          type: "template",
          template: {
            name: "testing",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      link: "https://res.cloudinary.com/dp8evydam/image/upload/v1776146783/bazar.sh_social_png_hxe6cr.png",
                    },
                  },
                ],
              },
            ],
          },
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    console.log("✅ Success:", data);
  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

sendWhatsApp();
