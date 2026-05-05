const API_URL = "https://hng-sumarin.vercel.app/api/summarize";

console.log("🔥 Sumarin background loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Background received:", request);

  if (request.action === "SUMMARIZE") {
    (async () => {
      try {
        const payload = request.payload;

        if (!payload?.text) {
          sendResponse({ error: "No content received" });
          return;
        }

        console.log("🚀 Calling API...");

        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        console.log("🔥 API RESPONSE:", data);

        sendResponse(data);

      } catch (err) {
        console.error("❌ Background API error:", err);
        sendResponse({ error: true });
      }
    })();

    return true; // VERY IMPORTANT
  }
});