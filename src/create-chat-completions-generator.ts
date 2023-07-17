import {z} from 'zod';

const dataSchema = z.object({
  choices: z.tuple([
    z
      .object({
        delta: z.object({
          content: z.string(),
          role: z.literal(`assistant`).optional(),
        }),
        finish_reason: z.null(),
        index: z.literal(0),
      })
      .or(
        z.object({
          delta: z.object({}),
          finish_reason: z.literal(`stop`).or(z.literal(`length`)).or(z.literal(`function_call`)),
          index: z.literal(0),
        }),
      )
      .or(
        z.object({
          delta: z.object({
            content: z.null().optional(),
            function_call: z.object({
              arguments: z.string(),
              name: z.string().optional(),
            }),
            role: z.literal(`assistant`).optional(),
          }),
          finish_reason: z.null(),
          index: z.literal(0),
        }),
      ),
  ]),
  created: z.number().int(),
  id: z.string(),
  model: z.string(),
  object: z.literal(`chat.completion.chunk`),
});

export async function* createChatCompletionsGenerator(
  reader: Pick<ReadableStreamDefaultReader<Uint8Array>, 'read'>,
): AsyncGenerator<z.TypeOf<typeof dataSchema>> {
  const decoder = new TextDecoder(`utf-8`);

  let buffer = ``;

  while (true) {
    const result = await reader.read();

    if (result.done) {
      return;
    }

    buffer += decoder.decode(result.value);

    while (true) {
      const newLineIndex = buffer.indexOf(`\n`);

      if (newLineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newLineIndex);

      if (line.startsWith(`data: `)) {
        const data = line.slice(6);

        if (data !== `[DONE]`) {
          yield dataSchema.parse(JSON.parse(data));
        }
      }

      buffer = buffer.slice(newLineIndex + 1);
    }
  }
}
