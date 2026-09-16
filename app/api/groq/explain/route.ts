import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/groq/explain
 * 
 * Server-side Groq API proxy. The API key never leaves the server.
 * Client components call THIS endpoint instead of Groq directly.
 * 
 * Body: { studentName, department, year, riskScore, riskLevel, contributingFactors, mode }
 * mode: 'explain' (risk narrative) | 'rationale' (intervention rationale)
 */
export async function POST(request: NextRequest) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'Groq API key not configured', fallback: true }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { mode, studentName, department, year, riskScore, riskLevel, contributingFactors, actionType, dominantFactor } = body;

    let prompt = '';

    if (mode === 'explain') {
      const factorSummary = (contributingFactors as Array<{ factor: string; points: number; reason: string }>)
        .map(f => `- ${f.factor} (${f.points} pts): ${f.reason}`)
        .join('\n');

      prompt = `You are an academic advisor AI for EarlyAlert, a student dropout prevention system.
A student has been flagged with a ${riskLevel} dropout risk score of ${riskScore}/100.

Student: ${studentName}, Year ${year}, ${department}
Risk Score: ${riskScore}/100 (${riskLevel})
Contributing Factors:
${factorSummary}

Write a concise, empathetic, and clear 2-3 sentence explanation of why this student is at risk, written for a human mentor.
Be specific about which factors are most concerning and why. Do NOT use bullet points. Write in plain English.`;

    } else if (mode === 'rationale') {
      prompt = `You are an academic advisor AI. A mentor is about to assign an intervention for a student.

Student: ${studentName}
Current Risk Score: ${riskScore}/100
Primary Risk Factor: ${dominantFactor}
Recommended Intervention: ${actionType}

Write a single, concise sentence (max 30 words) explaining WHY this specific intervention was recommended for this student. Be direct and practical.`;
    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "explain" or "rationale".' }, { status: 400 });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: mode === 'rationale' ? 80 : 200,
        temperature: 0.4,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('[Groq API Error]', groqResponse.status, errText);
      return NextResponse.json({ error: 'Groq API error', fallback: true }, { status: 502 });
    }

    const data = await groqResponse.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ text, model: 'llama-3.1-8b-instant', powered: true });

  } catch (error) {
    console.error('[API /groq/explain]', error);
    return NextResponse.json({ error: 'Internal server error', fallback: true }, { status: 500 });
  }
}
