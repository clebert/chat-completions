import type {ChatCompletionsRequestBody} from './create-chat-completions-stream.js';
import type {InferSnapshot} from 'state-guard';

import {createChatCompletionsGenerator} from './create-chat-completions-generator.js';
import {createChatCompletionsStream} from './create-chat-completions-stream.js';
import {createMachine} from 'state-guard';

export interface IsSending {
  readonly apiKey: string;
  readonly body: ChatCompletionsRequestBody;
}

export interface IsReceiving {
  readonly content: string;
  readonly contentDelta: string;
}

export interface IsFinished {
  readonly reason: 'function_call' | 'length' | 'stop';
  readonly content: string;
}

export interface IsReceivingFunctionCall {
  readonly functionName: string;
  readonly functionArgs: string;
  readonly functionArgsDelta: string;
}

export interface IsFunctionCallFinished {
  readonly reason: 'function_call' | 'length' | 'stop';
  readonly functionName: string;
  readonly functionArgs: string;
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
      isReceivingFunctionCall: (value: IsReceivingFunctionCall) => value,
      isFunctionCallFinished: (value: IsFunctionCallFinished) => value,
      isFailed: (value: IsFailed) => value,
    },
    transitionsMap: {
      isInitialized: {
        send: `isSending`,
      },
      isSending: {
        initialize: `isInitialized`,
        receive: `isReceiving`,
        receiveFunctionCall: `isReceivingFunctionCall`,
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
      isReceivingFunctionCall: {
        initialize: `isInitialized`,
        receiveFunctionCall: `isReceivingFunctionCall`,
        finishFunctionCall: `isFunctionCallFinished`,
        fail: `isFailed`,
      },
      isFunctionCallFinished: {
        initialize: `isInitialized`,
        send: `isSending`,
      },
      isFailed: {
        initialize: `isInitialized`,
      },
    },
  });

  // eslint-disable-next-line complexity
  machine.subscribe(async () => {
    const isSending = machine.get(`isSending`);

    if (!isSending) {
      return;
    }

    let isReceiving: InferSnapshot<typeof machine, 'isReceiving'> | undefined;

    let isReceivingFunctionCall:
      | InferSnapshot<typeof machine, 'isReceivingFunctionCall'>
      | undefined;

    const abortController = new AbortController();

    try {
      const stream = await createChatCompletionsStream({
        ...isSending.value,
        signal: abortController.signal,
      });

      let snapshot = machine.get();

      if (snapshot !== isSending) {
        abortController.abort();

        return;
      }

      for await (const {choices} of createChatCompletionsGenerator(stream.getReader())) {
        const [{delta, finish_reason}] = choices;

        snapshot = machine.get();

        if (snapshot === isSending) {
          if (`function_call` in delta) {
            const {name: functionName, arguments: functionArgsDelta} = delta.function_call;

            if (!functionName) {
              throw new Error(`Undefined function name.`);
            }

            isReceivingFunctionCall = snapshot.actions.receiveFunctionCall({
              functionName,
              functionArgs: functionArgsDelta,
              functionArgsDelta,
            });
          } else if (`content` in delta) {
            const {content: contentDelta} = delta;

            isReceiving = snapshot.actions.receive({content: contentDelta, contentDelta});
          } else {
            break;
          }
        } else if (snapshot === isReceiving) {
          if (`function_call` in delta) {
            break;
          } else if (`content` in delta) {
            const {content: contentDelta} = delta;

            isReceiving = snapshot.actions.receive({
              content: snapshot.value.content + contentDelta,
              contentDelta,
            });
          } else if (finish_reason) {
            snapshot.actions.finish({reason: finish_reason, content: snapshot.value.content});
          } else {
            break;
          }
        } else if (snapshot === isReceivingFunctionCall) {
          if (`function_call` in delta) {
            const {arguments: functionArgsDelta} = delta.function_call;

            isReceivingFunctionCall = snapshot.actions.receiveFunctionCall({
              functionName: snapshot.value.functionName,
              functionArgs: snapshot.value.functionArgs + functionArgsDelta,
              functionArgsDelta,
            });
          } else if (finish_reason) {
            snapshot.actions.finishFunctionCall({
              reason: finish_reason,
              functionName: snapshot.value.functionName,
              functionArgs: snapshot.value.functionArgs,
            });
          } else {
            break;
          }
        } else {
          abortController.abort();

          return;
        }
      }

      snapshot = machine.get();

      if (
        snapshot === isSending ||
        snapshot === isReceiving ||
        snapshot === isReceivingFunctionCall
      ) {
        throw new Error(`Unexpected termination of chat completions stream.`);
      }
    } catch (error: unknown) {
      abortController.abort();

      const snapshot = machine.get();

      if (snapshot === isSending || snapshot === isReceivingFunctionCall) {
        snapshot.actions.fail({error});
      } else if (snapshot === isReceiving) {
        snapshot.actions.fail({error, content: snapshot.value.content});
      }
    }
  }, options);

  return machine;
}
