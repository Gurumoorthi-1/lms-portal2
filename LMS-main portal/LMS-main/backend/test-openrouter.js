import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const testRun = async () => {
  try {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "user", content: "Hello, return JSON: {\"stdout\": \"test\"}" }],
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "LMS Portal Test",
        "Content-Type": "application/json"
      }
    });
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
};

testRun();
