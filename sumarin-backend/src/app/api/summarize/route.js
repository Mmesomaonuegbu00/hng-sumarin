import { NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req) {
  try {
    const { text: pageText, title } = await req.json();

    if (!pageText || pageText.length < 200) {
      return NextResponse.json(
        { error: "Content too short for analysis." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const sanitizedContent = pageText.slice(0, 12000);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You are a HIGH-QUALITY content summarizer.

CRITICAL RULES:
- Output ONLY valid JSON
- No markdown
- No explanations
- Be strict and structured

OUTPUT FORMAT:
{
  "title": "Short improved headline",
  "summary": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "takeaways": ["Action 1", "Action 2", "Action 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "readingTime": "⏱ X min read",
  "score": 85
}

RULES:
- summary MUST be 3–5 SHORT CLEAR points
- keyInsights MUST be deep understanding (not repetition)
- takeaways MUST be actionable steps
- score MUST be between 70–95 (never below 70 unless content is bad)
- reading time estimate based on length
`
        },
        {
          role: "user",
          content: `
TITLE: ${title}

CONTENT:
${sanitizedContent}
`
        },
      ],
      temperature: 0.3, // lower = more structured output
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content;

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid AI JSON response" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const responseData = {
      title: data.title || title || "Smart Summary",
      summary: Array.isArray(data.summary) ? data.summary.slice(0, 5) : [],
      keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights.slice(0, 5) : [],
      takeaways: Array.isArray(data.takeaways) ? data.takeaways.slice(0, 5) : [],
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      readingTime: data.readingTime || "⏱ 1–2 min read",
      score:
        typeof data.score === "number"
          ? Math.min(95, Math.max(70, data.score))
          : 82,
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: CORS_HEADERS,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate summary.",
        details: error?.message,
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}