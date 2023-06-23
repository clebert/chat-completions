import {createChatCompletionsMachine} from './lib/index.js';
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
