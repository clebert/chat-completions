export interface ChatCompletionsRequestInit {
  readonly apiKey: string;
  readonly body: ChatCompletionsRequestBody;
  readonly signal?: AbortSignal;
}

export interface ChatCompletionsRequestBody {
  readonly model: string;
  readonly messages: readonly ChatCompletionsMessage[];
  readonly functions?: readonly ChatCompletionsFunction[];
  readonly function_call?: 'auto' | 'none' | {readonly name: string};
  readonly temperature?: number;
  readonly max_tokens?: number;
  readonly user?: string;
}

export type ChatCompletionsMessage =
  | {
      readonly role: 'assistant' | 'system' | 'user';
      readonly content: string;
    }
  | {
      readonly role: 'assistant';
      readonly content: null;
      readonly function_call: {readonly name: string; readonly arguments: string};
    }
  | {
      readonly role: 'function';
      readonly content: string;
      readonly name: string;
    };

export interface ChatCompletionsFunction {
  readonly name: string;
  readonly description?: string;
  readonly parameters: ChatCompletionsFunctionParameters;
}

export interface ChatCompletionsFunctionParameters {
  readonly type: 'object';
  readonly properties: object;
  readonly required?: readonly string[];
}

export async function createChatCompletionsStream(
  requestInit: ChatCompletionsRequestInit,
): Promise<ReadableStream<Uint8Array>> {
  const {apiKey, body: requestBody, signal} = requestInit;

  const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
    method: `POST`,
    headers: {'Content-Type': `application/json`, 'Authorization': `Bearer ${apiKey}`},
    body: JSON.stringify({...requestBody, stream: true}),
    signal,
  });

  const {body: responseBody} = response;

  if (!responseBody || !response.ok) {
    try {
      console.error(await response.json());
    } catch {}

    throw new Error(`Error connecting to OpenAI API: ${response.statusText}`);
  }

  if (signal?.aborted) {
    if (!responseBody.locked) {
      await responseBody.cancel();
    }
  } else {
    signal?.addEventListener(`abort`, () => {
      if (!responseBody.locked) {
        void responseBody.cancel();
      }
    });
  }

  return responseBody;
}
