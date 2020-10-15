import TestStructure from './TestStructure';
import getTest from './getTest';
import { Arguments } from './Arguments';
import Blocker from './Blocker';
import Environment from './Environment';
import { getTimer, getNowDateTime } from './Helpers';

// eslint-disable-next-line no-undef
__non_webpack_require__('source-map-support').install();

const checkArgs = (args: ArgumentsType): void => {
  if (!args.PPD_TESTS.length) {
    throw new Error('There is no tests to run. Pass any test in PPD_TESTS argument');
  }

  if (!args.PPD_ENVS.length) {
    throw new Error('There is no environments to run. Pass any test in PPD_ENVS argument');
  }

  args.PPD_TESTS.forEach((testName) => {
    if (!testName) {
      throw new Error('There is blank test name. Pass any test in PPD_TESTS argument');
    }
  });
};

export default async function run(argsInput = {}, closeProcess: boolean = true): Promise<void> {
  const { envsId, envsPool, socket, logger } = Environment();
  const blocker = new Blocker();
  const args = { ...new Arguments(argsInput, true).args };
  checkArgs(args);

  try {
    const startTime = process.hrtime.bigint();
    const initArgsTime = getTimer(startTime);

    for (let i = 0; i < args.PPD_TESTS.length; i += 1) {
      const testName = args.PPD_TESTS[i];
      const startTimeTest = process.hrtime.bigint();

      envsPool.setCurrentTest(testName);

      if (i === 0) {
        await logger.log({ level: 'timer', text: `Init time 🕝: ${initArgsTime} sec.` });
      }
      await logger.log({ level: 'timer', text: `Test '${testName}' start on '${getNowDateTime()}'` });

      await envsPool.init(false);
      const { fullJSON, textDescription } = new TestStructure(envsId);
      const test = getTest(fullJSON, envsId, socket);
      await envsPool.runBrowsers();
      blocker.reset();

      await logger.log({ level: 'env', text: `\n${textDescription}` });
      await logger.log({ level: 'timer', text: `Prepare time 🕝: ${getTimer(startTimeTest)} sec.` });
      await test();
      await logger.log({ level: 'timer', text: `Test '${testName}' time 🕝: ${getTimer(startTimeTest)} sec.` });
    }

    await envsPool.closeBrowsers();
    await envsPool.closeProcesses();

    await logger.log({ level: 'timer', text: `Evaluated time 🕝: ${getTimer(startTime)} sec.` });

    // if (!module.parent) {
    if (closeProcess) {
      process.exit(0);
    }
    // }
  } catch (error) {
    if (String(error).startsWith('SyntaxError') || String(error).startsWith('TypeError')) {
      error.debug = true;
      error.type = 'SyntaxError';
      // eslint-disable-next-line no-console
      console.log(error);
    }
    throw error;
  }
}
