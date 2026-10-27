import { HttpError } from "./http";

export interface StructuredRequest {
  schemaName: string;
  schema: Record<string, unknown>;
  system: string;
  user: string;
  /** Includes reasoning tokens, so it needs plenty of room above the visible answer. */
  maxOutputTokens: number;
}

export interface ModelChoice {
  model: string;
  effort: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
}

interface ResponsesOutput {
  status?: string;
  incomplete_details?: { reason?: string };
  usage?: { input_tokens?: number; output_tokens?: number; output_tokens_details?: { reasoning_tokens?: number } };
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string; refusal?: string }> }>;
}

/** Calls the OpenAI Responses API with a strict JSON schema and returns the parsed object. */
export async function generateStructured<T>(
  env: Env,
  request: StructuredRequest,
  choice: ModelChoice,
): Promise<{ result: T; usage: TokenUsage }> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: choice.model,
        reasoning: { effort: choice.effort },
        // Resumes are never kept by OpenAI for this app.
        store: false,
        max_output_tokens: request.maxOutputTokens,
        input: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        text: {
          format: { type: "json_schema", name: request.schemaName, schema: request.schema, strict: true },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "openai request failed", error: String(error) }));
    throw new HttpError(502, "ai_unavailable", "The AI service is unavailable. Try again shortly.");
  }

  if (!response.ok) {
    console.error(JSON.stringify({ message: "openai error", status: response.status, body: (await response.text()).slice(0, 500) }));
    throw new HttpError(502, "ai_unavailable", "The AI service is unavailable. Try again shortly.");
  }

  const body = (await response.json()) as ResponsesOutput;
  const usage: TokenUsage = {
    input: body.usage?.input_tokens ?? 0,
    output: body.usage?.output_tokens ?? 0,
    reasoning: body.usage?.output_tokens_details?.reasoning_tokens ?? 0,
  };

  if (body.status === "incomplete") {
    console.error(JSON.stringify({ message: "openai incomplete", reason: body.incomplete_details?.reason, model: choice.model, usage }));
    throw new HttpError(502, "ai_incomplete", "The AI response was cut short. Try again.");
  }

  for (const item of body.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "refusal") {
        throw new HttpError(422, "ai_refused", "The AI declined this request.");
      }
      if (part.type === "output_text" && part.text) {
        try {
          return { result: JSON.parse(part.text) as T, usage };
        } catch {
          throw new HttpError(502, "ai_invalid", "The AI returned an unreadable response.");
        }
      }
    }
  }
  throw new HttpError(502, "ai_invalid", "The AI returned an empty response.");
}
