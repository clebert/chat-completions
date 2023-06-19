export type ChatCompletion =
  | {readonly role: 'assistant'}
  | {readonly content: string}
  | {readonly finishReason: 'content_filter' | 'length' | 'stop'};

type ChoicesObject =
  | {
      readonly choices: readonly [
        {
          readonly delta: {readonly content: string};
          readonly finish_reason: null;
        },
      ];
    }
  | {
      readonly choices: readonly [
        {
          readonly delta: {};
          readonly finish_reason: 'content_filter' | 'length' | 'stop';
        },
      ];
    };

export async function* createChatCompletionsGenerator(
  reader: Pick<ReadableStreamDefaultReader<Uint8Array>, 'read'>,
): AsyncGenerator<ChatCompletion> {
  const decoder = new TextDecoder(`utf-8`);

  let buffer: string | undefined;

  while (true) {
    let result;

    try {
      result = await reader.read();

      if (result.done) {
        return;
      }
    } catch {
      return;
    }

    const chunk = decoder.decode(result.value, {stream: true});

    if (buffer === undefined) {
      let errorObject: {readonly error?: {readonly message: string}} | undefined;

      try {
        errorObject = JSON.parse(chunk);
      } catch {}

      if (errorObject?.error) {
        throw new Error(errorObject.error.message);
      }

      buffer = ``;
    }

    buffer += chunk;

    while (true) {
      const newLineIndex = buffer.indexOf(`\n`);

      if (newLineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newLineIndex);

      buffer = buffer.slice(newLineIndex + 1);

      if (line.startsWith(`data:`)) {
        const data = line.slice(5).trim();

        if (data && data !== `[DONE]`) {
          const {
            choices: [choice],
          }: ChoicesObject = JSON.parse(data);

          if (choice.finish_reason) {
            yield {finishReason: choice.finish_reason};
          } else {
            yield choice.delta;
          }
        }
      }
    }
  }
}
