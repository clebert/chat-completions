import {createChatCompletionsMachine} from './lib/index.js';
import {env, stderr, stdout} from 'node:process';

const apiKey = /** @type {string} */ (env.API_KEY);

/** @type {import('./lib/index.js').ChatCompletionsMessage[]} */
const messages = [{role: `user`, content: `Hello`}];

const machine = createChatCompletionsMachine();

machine.subscribe(() => {
  const snapshot = machine.get();

  switch (snapshot.state) {
    case `isReceivingContent`: {
      stdout.write(snapshot.value.contentDelta);

      break;
    }
    case `isContentFinished`: {
      stdout.write(`\n`);

      break;
    }
    case `isFunctionCallFinished`: {
      const {functionName, functionArgs} = snapshot.value;

      messages.push({
        role: `assistant`,
        content: null,
        function_call: {name: functionName, arguments: functionArgs},
      });

      messages.push({role: `function`, content: `John Doe`, name: functionName});

      setTimeout(() => {
        snapshot.actions.send({apiKey, body: {model: `gpt-4`, messages}});
      });

      break;
    }
    case `isFailed`: {
      stderr.write(`${snapshot.value.error}\n`);
    }
  }
});

machine.assert(`isInitialized`).actions.send({
  apiKey,
  body: {
    model: `gpt-4`,
    messages,
    functions: [{name: `getUserName`, parameters: {type: `object`, properties: {}}}],
    function_call: {name: `getUserName`},
  },
});
