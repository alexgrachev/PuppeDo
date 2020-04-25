"use strict";
// require('source-map-support').install();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const safe_eval_1 = __importDefault(require("safe-eval"));
const Helpers_1 = require("./Helpers");
const Blocker_1 = require("./Blocker");
const Arguments_1 = require("./Arguments");
const Log_1 = require("./Log");
const Environment_1 = __importDefault(require("./Environment"));
const TestContent_1 = __importDefault(require("./TestContent"));
const Error_1 = require("./Error");
const ALIASES = {
    data: ['d', '📋'],
    bindData: ['bD', 'bd', '📌📋', 'dataBind', 'db', 'dB'],
    dataFunction: ['dF', 'df', '🔑📋', 'functionData', 'fd', 'fD'],
    selectors: ['selector', 's', '💠'],
    bindSelectors: ['bindSelector', 'bS', 'bs', '📌💠', 'selectorBind', 'selectorsBind', 'sb', 'sB'],
    selectorsFunction: ['selectorFunction', 'sF', 'sf', '🔑💠', 'functionSelector', 'functionSelectors', 'fs', 'fS'],
    bindResults: ['bindResult', 'bR', 'br', 'result', 'r', '↩️', 'R', 'rb', 'rB', 'resultBind', 'resultsBind'],
    resultFunction: ['rF', 'rf', '🔑↩️', 'functionResult', 'fr', 'fR'],
    options: ['option', 'opt', 'o', '⚙️'],
};
const checkNeeds = (needs, data, testName) => {
    // [['data', 'd'], 'another', 'optional?']
    const keysData = new Set(Object.keys(data));
    lodash_1.default.forEach(needs, (d) => {
        if (lodash_1.default.isString(d) && d.endsWith('?'))
            return; // optional parameter
        const keysDataIncome = new Set(lodash_1.default.isString(d) ? [d] : d);
        const intersectionData = new Set([...keysData].filter((x) => keysDataIncome.has(x)));
        if (!intersectionData.size) {
            throw new Error(`Error: can't find data parameter "${d}" in ${testName} test`);
        }
    });
    return true;
};
const resolveDataFunctions = (funcParams, dataLocal, selectorsLocal = {}) => {
    const allDataSel = Helpers_1.merge(dataLocal, selectorsLocal);
    const funcEval = Object.entries(funcParams).reduce((s, v) => {
        const [key, data] = v;
        const evalData = safe_eval_1.default(data.toString(), allDataSel);
        const collector = Object.assign(Object.assign({}, s), { [key]: evalData });
        return collector;
    }, {});
    return funcEval;
};
const resolveAliases = (valueName, inputs = {}, aliases = {}) => {
    try {
        let result = {};
        const values = [valueName, ...lodash_1.default.get(aliases, valueName, [])];
        values.forEach((v) => {
            result = Helpers_1.merge(result, inputs[v] || {});
        });
        return result;
    }
    catch (error) {
        error.message += ` || function resolveAliases(${valueName})`;
        throw error;
    }
};
const checkNeedEnv = ({ needEnv, envName } = {}) => {
    const needEnvs = lodash_1.default.isString(needEnv) ? [needEnv] : needEnv;
    if (lodash_1.default.isArray(needEnvs)) {
        if (needEnvs.length && !needEnvs.includes(envName)) {
            throw new Error(`Wrong Environment, local current env = ${envName}, but test pass needEnvs = ${needEnvs}`);
        }
    }
    else {
        throw new Error('needEnv wrong format, should be array or string');
    }
};
class Test {
    constructor(_a = {}) {
        var { name, type = 'test', levelIndent = 0, needEnv = [], needData = [], needSelectors = [], allowResults = [], data = {}, selectors = {}, options = {}, dataExt = [], selectorsExt = [], beforeTest = () => { }, runTest = () => { }, afterTest = () => { }, errorTest = () => { }, source = '', repeat = 1, socket = Helpers_1.blankSocket, stepId = null, breadcrumbs = [] } = _a, constructorArgs = __rest(_a, ["name", "type", "levelIndent", "needEnv", "needData", "needSelectors", "allowResults", "data", "selectors", "options", "dataExt", "selectorsExt", "beforeTest", "runTest", "afterTest", "errorTest", "source", "repeat", "socket", "stepId", "breadcrumbs"]);
        this.name = name;
        this.type = type;
        this.needEnv = needEnv;
        this.needData = needData;
        this.needSelectors = needSelectors;
        this.dataTest = data;
        this.selectorsTest = selectors;
        this.options = options;
        this.dataExt = dataExt;
        this.selectorsExt = selectorsExt;
        this.allowResults = allowResults;
        this.beforeTest = beforeTest;
        this.runTest = runTest;
        this.afterTest = afterTest;
        this.errorTest = errorTest;
        this.levelIndent = levelIndent;
        this.repeat = repeat;
        this.source = source;
        this.socket = socket;
        this.stepId = stepId;
        this.breadcrumbs = breadcrumbs;
        this.funcFile = constructorArgs.funcFile;
        this.testFile = constructorArgs.testFile;
        this.fetchData = (isSelector = false) => {
            const { PPD_SELECTORS, PPD_DATA } = new Arguments_1.Arguments();
            const dataName = isSelector ? 'selectors' : 'data';
            // * Get data from ENV params global
            let joinArray = isSelector ? [PPD_SELECTORS] : [PPD_DATA];
            // * Get data from current env
            joinArray = [...joinArray, this.env ? this.env.get(dataName) : {}];
            // * Get data from global envs for all tests
            joinArray = [...joinArray, this.envs.get(dataName, {})];
            // * Fetch data from ext files that passed in test itself
            const allTests = new TestContent_1.default();
            const extFiles = isSelector ? this.selectorsExt : this.dataExt;
            extFiles.forEach((v) => {
                const extData = allTests[dataName].find((d) => v === d.name);
                if (extData) {
                    joinArray = [...joinArray, extData.data];
                }
            });
            // * Get data from test itself in test describe
            joinArray = [...joinArray, isSelector ? this.selectorsTest : this.dataTest];
            // * Update local data with bindings
            let dataLocal = Helpers_1.merge(...joinArray);
            const bindDataLocal = isSelector ? this.bindSelectors : this.bindData;
            Object.entries(bindDataLocal).forEach((v) => {
                const [key, val] = v;
                dataLocal[key] = lodash_1.default.get(dataLocal, val);
            });
            // * Update after all bindings with data from test itself passed in running
            const collectedData = isSelector ? this.selectors : this.data;
            dataLocal = Helpers_1.merge(dataLocal, collectedData);
            return dataLocal;
        };
        this.fetchSelectors = () => this.fetchData(true);
        this.checkIf = (expr, ifType, log, ifLevelIndent, locals = {}) => __awaiter(this, void 0, void 0, function* () {
            let exprResult;
            const { dataLocal = {}, selectorsLocal = {}, localResults = {} } = locals;
            try {
                exprResult = safe_eval_1.default(expr, Helpers_1.merge(dataLocal, selectorsLocal, localResults));
            }
            catch (error) {
                if (error.name === 'ReferenceError') {
                    yield log({
                        level: 'error',
                        levelIndent: ifLevelIndent,
                        text: `Can't evaluate ${ifType} = '${error.message}'`,
                    });
                }
                throw new Error(`Can't evaluate ${ifType} = '${error.message}'`);
            }
            if (!exprResult && ifType === 'if') {
                yield log({
                    level: 'info',
                    screenshot: false,
                    fullpage: false,
                    levelIndent: ifLevelIndent,
                    text: `Skipping with expr '${expr}'`,
                });
                return true;
            }
            if (exprResult && ifType !== 'if') {
                yield log({
                    level: 'error',
                    levelIndent: ifLevelIndent,
                    text: `Test stopped with expr ${ifType} = '${expr}'`,
                });
                throw new Error(`Test stopped with expr ${ifType} = '${expr}'`);
            }
            return false;
        });
        this.runLogic = ({ dataExtLogic = [], selectorsExtLogic = [], inputArgs = {} } = {}, envsId = null) => __awaiter(this, void 0, void 0, function* () {
            const startTime = new Date();
            const inputs = Helpers_1.merge(constructorArgs, inputArgs);
            this.data = resolveAliases('data', inputs, ALIASES);
            this.bindData = resolveAliases('bindData', inputs, ALIASES);
            this.dataFunction = resolveAliases('dataFunction', inputs, ALIASES);
            this.dataExt = [...new Set([...this.dataExt, ...dataExtLogic])];
            this.selectors = resolveAliases('selectors', inputs, ALIASES);
            this.bindSelectors = resolveAliases('bindSelectors', inputs, ALIASES);
            this.selectorsFunction = resolveAliases('selectorsFunction', inputs, ALIASES);
            this.selectorsExt = [...new Set([...this.selectorsExt, ...selectorsExtLogic])];
            this.bindResults = resolveAliases('bindResults', inputs, ALIASES);
            this.resultFunction = resolveAliases('resultFunction', inputs, ALIASES);
            this.options = Helpers_1.merge(this.options, inputs.options || {}, resolveAliases('options', inputs, ALIASES));
            this.description = inputs.description || this.description;
            this.repeat = inputs.repeat || this.repeat;
            this.while = inputs.while || this.while;
            this.if = inputs.if || this.if;
            this.errorIf = inputs.errorIf || this.errorIf;
            this.errorIfResult = inputs.errorIfResult || this.errorIfResult;
            if (!envsId) {
                throw new Error('Test should have envsId');
            }
            const { envs } = Environment_1.default({ envsId });
            const logger = new Log_1.Log({ envsId });
            try {
                const { PPD_DISABLE_ENV_CHECK, PPD_LOG_EXTEND } = new Arguments_1.Arguments();
                this.envs = envs;
                this.envName = this.envs.get('current.name');
                this.envPageName = this.envs.get('current.page');
                this.env = this.envs.get(`envs.${this.envName}`);
                if (!PPD_DISABLE_ENV_CHECK) {
                    checkNeedEnv({ needEnv: this.needEnv, envName: this.envName });
                }
                let dataLocal = this.fetchData();
                let selectorsLocal = this.fetchSelectors();
                const allData = Helpers_1.merge(dataLocal, selectorsLocal);
                // FUNCTIONS
                const dFResults = resolveDataFunctions(this.dataFunction, allData);
                const sFResults = resolveDataFunctions(this.selectorsFunction, allData);
                // Update data and selectors with functions result
                dataLocal = Helpers_1.merge(dataLocal, dFResults);
                selectorsLocal = Helpers_1.merge(selectorsLocal, sFResults);
                checkNeeds(needData, dataLocal, this.name);
                checkNeeds(needSelectors, selectorsLocal, this.name);
                // All data passed to log
                const argsFields = [
                    'envName',
                    'envPageName',
                    'options',
                    'allowResults',
                    'bindResults',
                    'bindSelectors',
                    'bindData',
                    'levelIndent',
                    'repeat',
                    'stepId',
                ];
                const args = Object.assign({ envsId, data: dataLocal, selectors: selectorsLocal, dataTest: this.data, selectorsTest: this.selectors }, lodash_1.default.pick(this, argsFields));
                // LOG TEST
                logger.bindData({ testSource: source, bindedData: args });
                yield logger.log({
                    text: this.description
                        ? `(${this.name}) ${this.description}`
                        : `(${this.name}) \u001B[41mTODO: Fill description\u001B[0m`,
                    level: 'test',
                    levelIndent,
                });
                // Extend with data passed to functions
                const argsExt = Object.assign(Object.assign({}, args), { env: this.env, envs: this.envs, browser: this.env ? this.env.getState('browser') : null, 
                    // If there is no page it`s might be API
                    page: this.env ? this.env.getState(`pages.${this.envPageName}`) : null, log: logger.log.bind(logger), _: lodash_1.default, name: this.name, description: this.description, socket: this.socket });
                // IF
                if (this.if) {
                    const skip = yield this.checkIf(this.if, 'if', logger.log.bind(logger), this.levelIndent + 1, {
                        dataLocal,
                        selectorsLocal,
                    });
                    if (skip) {
                        return;
                    }
                }
                // ERROR IF
                if (this.errorIf) {
                    yield this.checkIf(this.errorIf, 'errorIf', logger.log.bind(logger), this.levelIndent + 1, {
                        dataLocal,
                        selectorsLocal,
                    });
                }
                // Set ENVS Data for the further nested tests
                if (this.env) {
                    this.envs.set('data', Helpers_1.merge(this.envs.get('data'), dataLocal));
                    this.envs.set('selectors', Helpers_1.merge(this.envs.get('selectors'), selectorsLocal));
                }
                // RUN FUNCTIONS
                const FUNCTIONS = [this.beforeTest, this.runTest, this.afterTest];
                let resultFromTest = {};
                for (let i = 0; i < FUNCTIONS.length; i += 1) {
                    let funcs = FUNCTIONS[i];
                    if (lodash_1.default.isFunction(funcs)) {
                        funcs = [funcs];
                    }
                    if (lodash_1.default.isArray(funcs)) {
                        for (let f = 0; f < funcs.length; f += 1) {
                            const fun = funcs[f];
                            // eslint-disable-next-line no-await-in-loop
                            const funResult = (yield fun(argsExt)) || {};
                            resultFromTest = Helpers_1.merge(resultFromTest, funResult);
                        }
                    }
                }
                // RESULTS
                // TODO: raise warning if not needed in allowResults
                // If Test there is no JS return. Get all data to read values
                if (this.type === 'test') {
                    resultFromTest = Helpers_1.merge(this.envs.get('data'), this.envs.get('selectors'));
                }
                const results = lodash_1.default.pick(resultFromTest, allowResults);
                if (Object.keys(results).length && Object.keys(results).length !== [...new Set(allowResults)].length) {
                    throw new Error('Can`t get results from test');
                }
                Object.entries(this.bindResults).forEach((v) => {
                    const [key, val] = v;
                    results[key] = lodash_1.default.get(results, val);
                });
                let localResults = Object.assign({}, results);
                // RESULT FUNCTIONS
                if (!lodash_1.default.isEmpty(this.resultFunction)) {
                    const dataWithResults = Helpers_1.merge(dataLocal, selectorsLocal, results);
                    const resultFunction = resolveDataFunctions(this.resultFunction, dataWithResults);
                    dataLocal = Helpers_1.merge(dataLocal, resultFunction);
                    selectorsLocal = Helpers_1.merge(selectorsLocal, resultFunction);
                    localResults = Helpers_1.merge(localResults, resultFunction);
                }
                // Set ENVS Data
                if (this.env) {
                    this.envs.set('data', Helpers_1.merge(this.envs.get('data'), dataLocal, localResults));
                    this.envs.set('selectors', Helpers_1.merge(this.envs.get('selectors'), selectorsLocal, localResults));
                }
                // ERROR
                if (this.errorIfResult) {
                    yield this.checkIf(this.errorIfResult, 'errorIfResult', logger.log.bind(logger), this.levelIndent + 1, {
                        dataLocal,
                        selectorsLocal,
                        localResults,
                    });
                }
                // WHILE
                if (this.while) {
                    const allDataSel = Helpers_1.merge(dataLocal, selectorsLocal);
                    const whileEval = safe_eval_1.default(this.while, allDataSel);
                    if (!whileEval) {
                        return;
                    }
                }
                // REPEAT
                if (this.repeat > 1) {
                    yield this.run(Object.assign(Object.assign({ dataExt: this.dataExt, selectorsExt: this.selectorsExt }, inputArgs), { repeat: this.repeat - 1 }), envsId);
                }
                // TIMER IN CONSOLE
                if (PPD_LOG_EXTEND) {
                    yield logger.log({
                        text: `🕝: ${new Date() - startTime} ms. (${this.name})`,
                        level: 'timer',
                        levelIndent,
                        extendInfo: true,
                    });
                }
            }
            catch (error) {
                const newError = new Error_1.TestError({ logger, parentError: error, test: this, envsId });
                yield newError.log();
                yield this.errorTest();
                throw newError;
            }
        });
        // eslint-disable-next-line no-shadow
        this.run = (_b = {}, envsId = null) => __awaiter(this, void 0, void 0, function* () {
            var { dataExt = [], selectorsExt = [] } = _b, inputArgs = __rest(_b, ["dataExt", "selectorsExt"]);
            const blocker = new Blocker_1.Blocker();
            const block = blocker.getBlock(this.stepId);
            const { blockEmitter } = blocker;
            if (block && blockEmitter) {
                // Test
                // setTimeout(() => {
                //   blocker.setBlock(this.stepId, false);
                // }, 2000);
                return new Promise((resolve) => {
                    blockEmitter.on('updateBlock', (newBlock) => __awaiter(this, void 0, void 0, function* () {
                        if (newBlock.stepId === this.stepId && !newBlock.block) {
                            yield this.runLogic({ dataExtLogic: dataExt, selectorsExtLogic: selectorsExt, inputArgs }, envsId);
                            resolve();
                        }
                    }));
                });
            }
            return this.runLogic({ dataExtLogic: dataExt, selectorsExtLogic: selectorsExt, inputArgs }, envsId);
        });
    }
}
module.exports = Test;
//# sourceMappingURL=AbstractTest.js.map