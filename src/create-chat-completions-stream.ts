export interface ChatCompletionsRequest {
  readonly apiKey: string;
  readonly model: string;
  readonly messages: readonly [ChatMessage, ...ChatMessage[]];
}

export interface ChatMessage {
  readonly role: 'assistant' | 'system' | 'user';
  readonly content: string;
}

export async function createChatCompletionsStream(
  request: ChatCompletionsRequest,
  options?: {readonly signal?: AbortSignal},
): Promise<ReadableStream<Uint8Array>> {
  const {apiKey, model, messages} = request;

  const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
    method: `POST`,
    headers: {'Content-Type': `application/json`, 'Authorization': `Bearer ${apiKey}`},
    body: JSON.stringify({
      model,
      messages: messages.map(({role, content}) => ({role, content})),
      stream: true,
    }),
    signal: options?.signal,
  });

  const {body} = response;

  if (!body || !response.ok) {
    throw new Error(`Error connecting to OpenAI API: ${response.statusText}`);
  }

  options?.signal?.addEventListener(`abort`, () => {
    if (!body.locked) {
      void body.cancel();
    }
  });

  return body;
}
