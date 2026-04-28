import axios from "axios";
const LANGUAGE_IDS = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  bash: "bash",
  html: null,
  css: null,
  yaml: null
};

const executeCode = async (code, language, stdin = '') => {
  try {
    const prompt = `
You are a code execution engine.

Language: ${language}
Code:
${code}

Input:
${stdin}

Return output in JSON format:
{
  "stdout": "...",
  "stderr": "...",
  "time": "...",
  "memory": "...",
  "status": { "description": "..." }
}
`;

    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "user", content: prompt }],
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "LMS Portal",
        "Content-Type": "application/json"
      }
    });

    // Extract text safely
    const choices = response.data?.choices;
    if (!choices || choices.length === 0) {
      throw new Error("OpenRouter returned no choices.");
    }
    const text = choices[0].message?.content || "";

    // Try parsing JSON safely
    let parsed;
    try {
      // Remove any markdown code blocks if present
      const cleanText = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
      parsed = JSON.parse(cleanText);
    } catch {
      console.log("AI returned non-JSON response, using raw text as stdout.");
      parsed = { stdout: text };
    }

    // Ensure all fields exist and mapping to Judge0-like status if possible
    return {
      status: parsed.status || { id: 3, description: "Accepted" },
      stdout: parsed.stdout || parsed.output || "",
      stderr: parsed.stderr || "",
      time: parsed.time || "0.001",
      memory: parsed.memory || "100",
      compile_output: parsed.compile_output || null
    };

  } catch (err) {
    console.error("OpenRouter Error Details:", err.response?.data || err.message);
    throw new Error(`Execution Service Error: ${err.response?.data?.error?.message || err.message}`);
  }
};

export const runCode = async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    const lang = LANGUAGE_IDS[language];

    if (lang === null || lang === undefined) {
      return res.json({
        status: { description: 'Preview Ready' },
        stdout: code,
        stderr: null,
        isPreview: true
      });
    }

    const result = await executeCode(code, lang, stdin || '');

    res.json({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      time: result.time,
      memory: result.memory,
      compile_output: result.compile_output || null
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { LANGUAGE_IDS, executeCode };