const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const moment = require('moment')
const puppeteer = require('puppeteer');

const env = require('./env')

const {log, createHTML} = require('./logger');

async function typeInput({ selCSS = "", selXPath = "", text = "", pageNum = 0, waitTime = 0, isScreenshot = false, isFullScreenshot = false } = {}) {
  if (_.get(env, ['pages', pageNum])) {
    page = _.get(env, ['pages', pageNum]);
    if (selCSS) {
      await page.type(selCSS, text);
    }
    await page.waitFor(waitTime);

    await log({ text: `Ввод текста в INPUT = ${selCSS}, TEXT = ${text}`, selCSS: [selCSS],  isScreenshot: isScreenshot, isFullScreenshot: isFullScreenshot });
  };
};

async function buttonClick({ selCSS = "", selXPath = "", pageNum = 0, waitTime = 0, isScreenshot = false, isFullScreenshot = false } = {}) {
  page = env.get(`pages.${pageNum}`);
  if (page) {
    await log({ text: `Нажата кнопка ${selCSS}`, selCSS: [selCSS], isScreenshot: isScreenshot, isFullScreenshot: isFullScreenshot });
    await page.click(selCSS);
  }
};

async function init({ output = 'output', name = 'test' } = {}) {
  if (!fs.existsSync(output)) {
    await fs.mkdirSync(output);
  };
  const now = moment().format('YYYY-MM-DD_HH-mm-ss.SSS');
  const outDir = path.join(output, `/${name}_${now}`);
  await fs.mkdirSync(outDir);

  env.set("outDir", outDir);
  env.set("outName", name);
}

async function start({} = {}) {

  await log({ text: 'START' });

  const browser = await puppeteer.launch({
    headless: env.get("headless", true),
    slowMo: env.get("slowMo", 0),
    args: env.get("args", [])
  });

  const page = await browser.newPage();
  const override = Object.assign(page.viewport(), env.get('windowSize'));
  await page.setViewport(override);
  await log({ text: 'Init page' });

  await page.goto(env.get('baseUrl'));
  env.set('browser', browser);
  env.set('pages', [page]);
  await log({ text: `Go to: ${env.get('baseUrl')}` });
}

async function end() {
  await log({ text: 'END' });
  await env.browser.close();
  await createHTML()
}

async function wait ({time = 0, timeout = 0, pageNum = 0, selector = false, selectorVisible = false, selectorHidden = false, navigation = false} = {}) {
  page = env.get(`pages.${pageNum}`);
  if (selector) {
    await page.waitForSelector( 
      selector, 
      {
        visible: selectorVisible,
        hidden: selectorHidden,
        timeout: timeout
      } 
    );
  }
  if (navigation) {
    await page.waitForNavigation({ waitUntil: navigation });
  }
  if (time) {

  }
}

module.exports = {
  typeInput,
  buttonClick,
  init,
  start,
  end,
  wait
}