import type {ChatCompletionsRequestBody} from './create-chat-completions-stream.js';
import type {InferSnapshot} from 'state-guard';

import {createChatCompletionsGenerator} from './create-chat-completions-generator.js';
import {createChatCompletionsStream} from './create-chat-completions-stream.js';
import {createMachine} from 'state-guard';

export interface IsSendingRequest {
  readonly apiKey: string;
  readonly body: ChatCompletionsRequestBody;
}

export interface IsReceivingContent {
  readonly content: string;
  readonly contentDelta: string;
}

export interface IsContentFinished {
  readonly reason: 'content_filter' | 'function_call' | 'length' | 'stop';
  readonly content: string;
}

export interface IsReceivingFunctionCall {
  readonly functionName: string;
  readonly functionArgs: string;
  readonly functionArgsDelta: string;
}

export interface IsFunctionCallFinished {
  readonly reason: 'content_filter' | 'function_call' | 'length' | 'stop';
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
      isSendingRequest: (value: IsSendingRequest) => value,
      isReceivingContent: (value: IsReceivingContent) => value,
      isContentFinished: (value: IsContentFinished) => value,
      isReceivingFunctionCall: (value: IsReceivingFunctionCall) => value,
      isFunctionCallFinished: (value: IsFunctionCallFinished) => value,
      isFailed: (value: IsFailed) => value,
    },
    transitionsMap: {
      isInitialized: {
        sendRequest: `isSendingRequest`,
      },
      isSendingRequest: {
        initialize: `isInitialized`,
        receiveContent: `isReceivingContent`,
        receiveFunctionCall: `isReceivingFunctionCall`,
        fail: `isFailed`,
      },
      isReceivingContent: {
        initialize: `isInitialized`,
        receiveContent: `isReceivingContent`,
        finishContent: `isContentFinished`,
        fail: `isFailed`,
      },
      isContentFinished: {
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
        sendRequest: `isSendingRequest`,
        fail: `isFailed`,
      },
      isFailed: {
        initialize: `isInitialized`,
      },
    },
  });

  // eslint-disable-next-line complexity
  machine.subscribe(async () => {
    const isSendingRequest = machine.get(`isSendingRequest`);

    if (!isSendingRequest) {
      return;
    }

    let isReceivingContent: InferSnapshot<typeof machine, 'isReceivingContent'> | undefined;

    let isReceivingFunctionCall:
      | InferSnapshot<typeof machine, 'isReceivingFunctionCall'>
      | undefined;

    const abortController = new AbortController();

    try {
      const stream = await createChatCompletionsStream({
        ...isSendingRequest.value,
        signal: abortController.signal,
      });

      let snapshot = machine.get();

      if (snapshot !== isSendingRequest) {
        abortController.abort();

        return;
      }

      for await (const {choices} of createChatCompletionsGenerator(stream.getReader())) {
        const [{delta, finish_reason}] = choices;

        snapshot = machine.get();

        if (snapshot === isSendingRequest) {
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

            isReceivingContent = snapshot.actions.receiveContent({
              content: contentDelta,
              contentDelta,
            });
          } else {
            break;
          }
        } else if (snapshot === isReceivingContent) {
          if (`function_call` in delta) {
            break;
          } else if (`content` in delta) {
            const {content: contentDelta} = delta;

            isReceivingContent = snapshot.actions.receiveContent({
              content: snapshot.value.content + contentDelta,
              contentDelta,
            });
          } else if (finish_reason) {
            snapshot.actions.finishContent({
              reason: finish_reason,
              content: snapshot.value.content,
            });
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
        snapshot === isSendingRequest ||
        snapshot === isReceivingContent ||
        snapshot === isReceivingFunctionCall
      ) {
        throw new Error(`Unexpected termination of chat completions stream.`);
      }
    } catch (error: unknown) {
      abortController.abort();

      const snapshot = machine.get();

      if (snapshot === isSendingRequest || snapshot === isReceivingFunctionCall) {
        snapshot.actions.fail({error});
      } else if (snapshot === isReceivingContent) {
        snapshot.actions.fail({error, content: snapshot.value.content});
      }
    }
  }, options);

  return machine;
}
