import {createChatCompletionsGenerator} from './create-chat-completions-generator.js';
import {describe, expect, it} from '@jest/globals';

const dataChunks = [
  `data: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{\"role\":\"assistant\"},\"index\":0,\"finish_reason\":null}]}\n\ndata: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{\"content\":\"As\"},\"index\":0,\"finish_reason\":null}]}\n\n`,
  `data: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{\"content\":\" an\"},\"index\":0,\"finish_reason\":null}]}\n\n`,
  `data: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{\"content\":\" expert\"},\"index\":0,\"finish_reason\":null}]}\n\n`,
  `data: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{\"content\":\" developer\"},\"index\":0,\"finish_reason\":null}]}\n\ndata: {\"id\":\"chatcmpl-xxx\",\"object\":\"chat.completion.chunk\",\"created\":1683559510,\"model\":\"gpt-4-0314\",\"choices\":[{\"delta\":{},\"index\":0,\"finish_reason\":\"length\"}]}\n\ndata: [DONE]\n\n`,
];

const errorChunks = [
  `{\n    \"error\": {\n        \"message\": \"Incorrect API key provided: ***. You can find your API key at https://platform.openai.com/account/api-keys.\",\n        \"type\": \"invalid_request_error\",\n        \"param\": null,\n        \"code\": \"invalid_api_key\"\n    }\n}\n`,
];

class AsyncReader {
  readonly #chunks: string[];

  constructor(chunks: readonly string[]) {
    this.#chunks = [...chunks];
  }

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    await Promise.resolve();

    const chunk = this.#chunks.shift();

    return chunk ? {done: false, value: new TextEncoder().encode(chunk)} : {done: true};
  }
}

describe(`createChatCompletionsGenerator()`, () => {
  it(`yields chat completions`, async () => {
    const generator = createChatCompletionsGenerator(new AsyncReader(dataChunks));

    expect(await generator.next()).toEqual({done: false, value: {role: `assistant`}});
    expect(await generator.next()).toEqual({done: false, value: {content: `As`}});
    expect(await generator.next()).toEqual({done: false, value: {content: ` an`}});
    expect(await generator.next()).toEqual({done: false, value: {content: ` expert`}});
    expect(await generator.next()).toEqual({done: false, value: {content: ` developer`}});
    expect(await generator.next()).toEqual({done: false, value: {finishReason: `length`}});
    expect(await generator.next()).toEqual({done: true});
  });

  it(`throws an error`, async () => {
    const generator = createChatCompletionsGenerator(new AsyncReader(errorChunks));

    await expect(generator.next()).rejects.toThrow(
      `Incorrect API key provided: ***. You can find your API key at https://platform.openai.com/account/api-keys.`,
    );
  });

  it(`ignores read errors`, async () => {
    const generator = createChatCompletionsGenerator({
      read() {
        throw new Error(`oops`);
      },
    });

    expect(await generator.next()).toEqual({done: true});
  });
});
