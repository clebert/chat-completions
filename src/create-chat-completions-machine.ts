import type {ChatCompletionsRequest} from './create-chat-completions-stream.js';
import type {InferSnapshot} from 'state-guard';

import {createChatCompletionsGenerator} from './create-chat-completions-generator.js';
import {createChatCompletionsStream} from './create-chat-completions-stream.js';
import {createMachine} from 'state-guard';

export interface IsSending extends ChatCompletionsRequest {}

export interface IsReceiving {
  readonly content: string;
  readonly contentDelta: string;
}

export interface IsFinished {
  readonly reason: 'content_filter' | 'length' | 'stop';
  readonly content: string;
}

export interface IsFailed {
  readonly error: unknown;
  readonly content?: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createChatCompletionsMachine(options?: {signal?: AbortSignal}) {
  const machine = createMachine({
    initialState: `isInitialized`,
    initialValue: undefined,
    transformerMap: {
      isInitialized: () => undefined,
      isSending: (value: IsSending) => value,
      isReceiving: (value: IsReceiving) => value,
      isFinished: (value: IsFinished) => value,
      isFailed: (value: IsFailed) => value,
    },
    transitionsMap: {
      isInitialized: {
        send: `isSending`,
      },
      isSending: {
        initialize: `isInitialized`,
        receive: `isReceiving`,
        fail: `isFailed`,
      },
      isReceiving: {
        initialize: `isInitialized`,
        receive: `isReceiving`,
        finish: `isFinished`,
        fail: `isFailed`,
      },
      isFinished: {
        initialize: `isInitialized`,
      },
      isFailed: {
        initialize: `isInitialized`,
      },
    },
  });

  machine.subscribe(async () => {
    const isSending = machine.get(`isSending`);

    if (!isSending) {
      return;
    }

    let isReceiving: InferSnapshot<typeof machine, 'isReceiving'> | undefined;

    const abortController = new AbortController();

    try {
      const stream = await createChatCompletionsStream(isSending.value, {
        signal: abortController.signal,
      });

      if (machine.get() !== isSending) {
        abortController.abort();

        return;
      }

      let content = ``;

      isReceiving = isSending.actions.receive({content, contentDelta: ``});

      for await (const chatCompletion of createChatCompletionsGenerator(stream.getReader())) {
        if (machine.get() !== isReceiving) {
          abortController.abort();

          return;
        }

        if (`content` in chatCompletion) {
          const {content: contentDelta} = chatCompletion;

          content += contentDelta;

          isReceiving = isReceiving.actions.receive({content, contentDelta});
        } else if (`finishReason` in chatCompletion) {
          isReceiving.actions.finish({reason: chatCompletion.finishReason, content});
        }
      }

      if (machine.get() === isReceiving) {
        throw new Error(`Unexpected termination of chat completions stream.`);
      }
    } catch (error: unknown) {
      abortController.abort();

      const snapshot = machine.get();

      if (snapshot === isSending) {
        isSending.actions.fail({error});
      } else if (snapshot === isReceiving) {
        isReceiving.actions.fail({error, content: isReceiving.value.content});
      }
    }
  }, options);

  return machine;
}
