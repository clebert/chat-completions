import {createChatCompletionsGenerator} from './create-chat-completions-generator.js';
import {describe, expect, test} from '@jest/globals';
import {readFile, readdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

async function readDataChunks(dataName: string): Promise<readonly string[]> {
  const chunks: string[] = [];
  const directoryName = join(dirname(fileURLToPath(import.meta.url)), `data`, dataName);

  for (const fileName of await readdir(directoryName)) {
    chunks.push(await readFile(join(directoryName, fileName), {encoding: `utf-8`}));
  }

  return chunks;
}

class AsyncReader {
  static async create(dataName: string): Promise<AsyncReader> {
    return new AsyncReader(await readDataChunks(dataName));
  }

  readonly #chunks: string[];

  private constructor(chunks: readonly string[]) {
    this.#chunks = [...chunks];
  }

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    await Promise.resolve();

    const chunk = this.#chunks.shift();

    return chunk ? {done: false, value: new TextEncoder().encode(chunk)} : {done: true};
  }
}

describe(`createChatCompletionsGenerator()`, () => {
  test(`finish reason: stop`, async () => {
    const generator = createChatCompletionsGenerator(
      await AsyncReader.create(`finish-reason-stop`),
    );

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ``, role: `assistant`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `Hello`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `!`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` How`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` can`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` I`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` assist`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` you`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` today`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `?`}, finish_reason: null, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {}, finish_reason: `stop`, index: 0}],
        created: 1689277476,
        id: `chatcmpl-7bwWqn8BMKzELX8RqaE9pB5BtPWjg`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({done: true, value: undefined});
  });

  test(`finish reason: length`, async () => {
    const generator = createChatCompletionsGenerator(
      await AsyncReader.create(`finish-reason-length`),
    );

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ``, role: `assistant`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `Hello`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `!`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` How`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` may`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` I`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` assist`}, finish_reason: null, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {}, finish_reason: `length`, index: 0}],
        created: 1689277780,
        id: `chatcmpl-7bwbkwJuw7BqJMi17MiAtCZW1XUC0`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({done: true, value: undefined});
  });

  test(`finish reason: content_filter`, async () => {
    const generator = createChatCompletionsGenerator(
      await AsyncReader.create(`finish-reason-content-filter`),
    );

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ``, role: `assistant`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `"I`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` must`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` not`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` fear`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: `.`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {content: ` Fear`}, finish_reason: null, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {}, finish_reason: `content_filter`, index: 0}],
        created: 1689623442,
        id: `chatcmpl-7dOWwvXeh6xXL0Zn9kvoYdgQ4CEtA`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({done: true, value: undefined});
  });

  test(`auto: function_call`, async () => {
    const generator = createChatCompletionsGenerator(
      await AsyncReader.create(`auto-function-call`),
    );

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [
          {
            delta: {
              content: null,
              function_call: {arguments: ``, name: `getUserName`},
              role: `assistant`,
            },
            finish_reason: null,
            index: 0,
          },
        ],
        created: 1689277356,
        id: `chatcmpl-7bwUuYxYLAMXjRKvVuFEZEysTF96M`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {function_call: {arguments: `{}`}}, finish_reason: null, index: 0}],
        created: 1689277356,
        id: `chatcmpl-7bwUuYxYLAMXjRKvVuFEZEysTF96M`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {}, finish_reason: `function_call`, index: 0}],
        created: 1689277356,
        id: `chatcmpl-7bwUuYxYLAMXjRKvVuFEZEysTF96M`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({done: true, value: undefined});
  });

  test(`force: function_call`, async () => {
    const generator = createChatCompletionsGenerator(
      await AsyncReader.create(`force-function-call`),
    );

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [
          {
            delta: {
              content: null,
              function_call: {arguments: ``, name: `getUserName`},
              role: `assistant`,
            },
            finish_reason: null,
            index: 0,
          },
        ],
        created: 1689277588,
        id: `chatcmpl-7bwYexF0c1yldtJVruhdeIwOd0rTL`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {function_call: {arguments: `{}`}}, finish_reason: null, index: 0}],
        created: 1689277588,
        id: `chatcmpl-7bwYexF0c1yldtJVruhdeIwOd0rTL`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({
      done: false,
      value: {
        choices: [{delta: {}, finish_reason: `stop`, index: 0}],
        created: 1689277588,
        id: `chatcmpl-7bwYexF0c1yldtJVruhdeIwOd0rTL`,
        model: `gpt-4-0613`,
        object: `chat.completion.chunk`,
      },
    });

    expect(await generator.next()).toEqual({done: true, value: undefined});
  });
});
