# ChatCompletions

> A reactive state machine implementation for OpenAI Chat Completions API.

ChatCompletions is a state machine implementation designed to interact seamlessly with the
[OpenAI Chat Completions API](https://platform.openai.com/docs/guides/gpt/chat-completions-api). It
wraps around the API calls and manages the communication state with a reactive approach. Utilizing
[StateGuard](https://github.com/clebert/state-guard), it supports both browser and Node environments
and simplifies the process of sending and receiving messages from the Chat Completions API.

## Installation

```sh
npm install chat-completions state-guard
```

## Usage Example

The following example demonstrates how to create and use a state machine to interact with the OpenAI
Chat Completions API in a Node.js environment:

```js
import {createChatCompletionsMachine} from 'chat-completions';
import {env, stderr, stdout} from 'node:process';

const machine = createChatCompletionsMachine();

machine.subscribe(() => {
  const snapshot = machine.get();

  switch (snapshot.state) {
    case `isReceiving`: {
      stdout.write(snapshot.value.contentDelta);
      break;
    }
    case `isFinished`: {
      stdout.write(`\n`);
      break;
    }
    case `isFailed`: {
      stderr.write(`${snapshot.value.error}\n`);
    }
  }
});

const apiKey = /** @type {string} */ (env.API_KEY);

machine.assert(`isInitialized`).actions.send({
  apiKey,
  model: `gpt-4`,
  messages: [{role: `user`, content: `Hello, World!`}],
});
```

## StateGuard State Machine Definition

```ts
createMachine({
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
```

```ts
interface IsSending {
  readonly apiKey: string;
  readonly model: string;
  readonly messages: readonly [ChatMessage, ...ChatMessage[]];
}

interface ChatMessage {
  readonly role: 'assistant' | 'system' | 'user';
  readonly content: string;
}
```

```ts
interface IsReceiving {
  readonly content: string;
  readonly contentDelta: string;
}
```

```ts
interface IsFinished {
  readonly reason: 'content_filter' | 'length' | 'stop';
  readonly content: string;
}
```

```ts
interface IsFailed {
  readonly error: unknown;
  readonly content?: string;
}
```
