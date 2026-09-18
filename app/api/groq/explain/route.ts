import { NextRequest, NextResponse } from 'next/server';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Models verified to be active on this API key. qwen3.8-27b produces the
// richest narrative but is the one Groq rate-limits first (HTTP 429), so the
// fast gpt-oss model acts as the stand-by.
const PRIMARY_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

// When Groq rate-limits the primary model, remember it for a short window so
// the following narratives go straight to the stand-by model instead of paying
// for a doomed request on every single call.
const RATE_LIMIT_COOLDOWN_MS = 60_000;
let primaryCooldownUntil = 0;

function callGroq(model: string, prompt: string, maxTokens: number) {
  return fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
}

/**
 * Helper to build deterministic fallback explanation if Groq is unavailable
 */
function buildDeterministicFallback(
  studentName?: string,
  year?: number,
  department?: string,
  riskScore?: number,
  riskLevel?: string,
  factors?: Array<{ factor: string; points: number; reason: string }>
): string {
  const name = studentName || 'The student';
  const yr = year ? `Year ${year}` : '';
  const dept = department || '';
  const meta = [yr, dept].filter(Boolean).join(', ');
  const metaStr = meta ? ` (${meta})` : '';
  const score = riskScore !== undefined ? riskScore : 0;
  const level = riskLevel || (score >= 61 ? 'High' : score >= 31 ? 'Medium' : 'Low');

  if (!factors || factors.length === 0) {
    return `${name}${metaStr} has a ${level.toLowerCase()} dropout risk score of ${score}/100 and is maintaining stable academic progress with no immediate warning flags.`;
  }

  const top = factors[0];
  const others = factors.slice(1, 3);
  let text = `${name}${metaStr} has a ${level.toLowerCase()} dropout risk score of ${score}/100. The primary concern is ${top.factor.toLowerCase()} (${top.reason.toLowerCase()}).`;
  if (others.length === 1) {
    text += ` This is compounded by ${others[0].factor.toLowerCase()} (${others[0].reason.toLowerCase()}).`;
  } else if (others.length >= 2) {
    text += ` Additional contributing signals include ${others[0].factor.toLowerCase()} and ${others[1].factor.toLowerCase()}.`;
  }
  return text;
}

/**
 * POST /api/groq/explain
 * 
 * Server-side Groq API proxy. The API key never leaves the server.
 * Client components call THIS endpoint instead of Groq directly.
 * 
 * Body: { studentName, department, year, riskScore, riskLevel, contributingFactors, mode, actionType, dominantFactor }
 * mode: 'explain' (risk narrative) | 'rationale' (intervention rationale)
 */
export async function POST(request: NextRequest) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { mode, studentName, department, year, riskScore, riskLevel, contributingFactors, actionType, dominantFactor } = body;
  const factors = Array.isArray(contributingFactors) ? contributingFactors : [];

  // Deterministic fallback generator if Groq is not configured or fails
  const getFallbackText = () => {
    if (mode === 'rationale') {
      return `"${actionType || 'Intervention'}" directly addresses ${studentName || 'the student'}'s primary risk signal (${dominantFactor || 'academic need'}) to stabilize progress.`;
    }
    return buildDeterministicFallback(studentName, year, department, riskScore, riskLevel, factors);
  };

  if (!GROQ_API_KEY) {
    console.warn('[Groq] GROQ_API_KEY is not set — returning fallback text.');
    return NextResponse.json({
      text: getFallbackText(),
      fallback: true,
      error: 'Groq API key not configured'
    }, { status: 200 });
  }

  try {
    let prompt = '';

    if (mode === 'explain') {
      const isHealthy = (riskScore ?? 0) <= 30 && factors.length === 0;

      if (isHealthy) {
        prompt = `You are an academic advisor AI for Sentinel, a student dropout prevention system.
A student has been assessed with a Low dropout risk score of ${riskScore ?? 0}/100.

Student: ${studentName || 'Student'}, Year ${year || 1}, ${department || 'General'}
Risk Score: ${riskScore ?? 0}/100 (${riskLevel || 'Low'})
Contributing Factors:
- No critical risk factors detected. Student maintains consistent attendance, passing marks, and active course engagement.

Write a concise, encouraging, and clear 2-sentence summary of this student's academic standing for a human mentor.
Highlight that they are on track and note any positive observations. Do NOT use bullet points. Write in plain English.`;
      } else {
        const factorSummary = factors.length > 0
          ? factors.map(f => `- ${f.factor} (${f.points} pts): ${f.reason}`).join('\n')
          : '- No specific negative factors listed.';

        prompt = `You are an academic advisor AI for Sentinel, a student dropout prevention system.
A student has been flagged with a ${riskLevel || 'Elevated'} dropout risk score of ${riskScore ?? 50}/100.

Student: ${studentName || 'Student'}, Year ${year || 1}, ${department || 'General'}
Risk Score: ${riskScore ?? 50}/100 (${riskLevel || 'Moderate'})
Contributing Factors:
${factorSummary}

Write a concise, empathetic, and clear 2-3 sentence explanation of why this student is at risk, written for a human mentor.
Be specific about which factors are most concerning and why. Do NOT use bullet points. Write in plain English.`;
      }

    } else if (mode === 'rationale') {
      prompt = `You are an academic advisor AI. A mentor is about to assign an intervention for a student.

Student: ${studentName || 'Student'}
Current Risk Score: ${riskScore ?? 50}/100
Primary Risk Factor: ${dominantFactor || 'Academic need'}
Recommended Intervention: ${actionType || 'Targeted support'}

Write a single, concise sentence (max 30 words) explaining WHY this specific intervention was recommended for this student. Be direct and practical.`;
    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "explain" or "rationale".' }, { status: 400 });
    }

    const maxTokens = mode === 'rationale' ? 80 : 220;

    // Skip the primary while it is cooling down from a rate-limit response.
    const coolingDown = Date.now() < primaryCooldownUntil;
    let model = coolingDown ? FALLBACK_MODEL : PRIMARY_MODEL;
    let groqResponse = await callGroq(model, prompt, maxTokens);

    // If the chosen model fails, retry once with the other one.
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      if (groqResponse.status === 429 && model === PRIMARY_MODEL && !coolingDown) {
        primaryCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        console.warn(`[Groq] "${PRIMARY_MODEL}" is rate-limited (429) — using "${FALLBACK_MODEL}" for the next ${RATE_LIMIT_COOLDOWN_MS / 1000}s.`);
      } else {
        console.warn(`[Groq] Model "${model}" failed (${groqResponse.status}): ${errText}. Retrying with the other model.`);
      }
      model = model === PRIMARY_MODEL ? FALLBACK_MODEL : PRIMARY_MODEL;
      groqResponse = await callGroq(model, prompt, maxTokens);
    }

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('[Groq API Error]', groqResponse.status, errText);
      return NextResponse.json({
        text: getFallbackText(),
        fallback: true,
        error: 'Groq API temporary error'
      }, { status: 200 });
    }

    const data = await groqResponse.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim() ?? '';
    const modelUsed: string = data?.model ?? model;

    if (!text) {
      console.warn('[Groq] Empty response from model — using fallback.');
      return NextResponse.json({
        text: getFallbackText(),
        fallback: true
      }, { status: 200 });
    }

    // Strip any <think>...</think> tags that reasoning models may emit
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return NextResponse.json({ text: cleanText || getFallbackText(), model: modelUsed, powered: !!(cleanText) });

  } catch (error) {
    console.error('[API /groq/explain]', error);
    return NextResponse.json({
      text: getFallbackText(),
      fallback: true,
      error: 'Internal server error'
    }, { status: 200 });
  }
}

