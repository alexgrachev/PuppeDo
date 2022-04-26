/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
import { randomUUID } from 'crypto';
import { TestExtendType } from './global.d';
import { pick } from './Helpers';
import Singleton from './Singleton';
import { Test } from './Test';

// type hooks = 'initValues' | 'runLogic' | 'resolveValues';

type Hooks = {
  initValues?: (initValues: TestExtendType) => void;
  runLogic?: () => void;
  resolveValues?: (inputs: TestExtendType) => void;
};

type PropogationsAndShares = {
  fromPrevSublingSimple: string[];
};

interface PluginType {
  name: string;
  hook: (name: keyof Hooks) => (unknown) => void;
  hooks: Hooks;
  propogationsAndShares?: PropogationsAndShares;
  values: any;
}

type PluginFunction = (allPlugins: Plugins) => PluginType;

// Storage of all scratch of plugins
export class PluginsFabric extends Singleton {
  private plugins: Record<string, PluginFunction>;
  constructor(reInit = false) {
    super();
    if (!this.plugins || reInit) {
      this.plugins = {};
    }
  }

  getAllPlugins(): Record<string, PluginFunction> {
    return this.plugins;
  }

  static getPlugin(): void {
    // do nothing
  }

  static registerPlugin(): void {
    // do nothing
  }

  addPlugin(name: string, newPlugin: PluginFunction): void {
    this.plugins[name] = newPlugin;
  }
}

export class Plugins {
  private plugins: PluginType[] = [];

  originTest: Test;

  blankHook: () => {
    // Blank
  };

  constructor(originTest: Test) {
    const plugins = new PluginsFabric().getAllPlugins();
    this.originTest = originTest;

    for (const plugin of Object.values(plugins)) {
      this.plugins.push(plugin(this));
    }
  }

  hook(name: keyof Hooks): (args: unknown) => void {
    return async (args: unknown) => {
      for (const plugin of this.plugins) {
        await plugin.hook(name)(args);
      }
    };
  }

  getValue(pluginName: string, valueName: string): unknown {
    return this.plugins.find((v) => v.name === pluginName)?.values[valueName] ?? this.originTest[valueName] ?? null;
  }

  getAllPropogatesAndSublings(type: keyof PropogationsAndShares): Record<string, unknown> {
    const propogationsAndShares = this.plugins.filter((v) => v.propogationsAndShares);
    const result = {};

    if (type === 'fromPrevSublingSimple') {
      const fromPrevSublingPlugins = propogationsAndShares.filter((v) => v.propogationsAndShares.fromPrevSublingSimple);
      fromPrevSublingPlugins.forEach((fromPrevSublingPlugin) => {
        fromPrevSublingPlugin.propogationsAndShares.fromPrevSublingSimple.forEach((v) => {
          result[v] = this.getValue(fromPrevSublingPlugin.name, v);
        });
      });
    }

    return result;
  }
}

export class Plugin<TValues> implements PluginType {
  id = randomUUID();

  name: string;

  defaultValues: TValues;

  values: TValues;

  allPlugins: Plugins;

  hooks: Required<Hooks> = {
    initValues: (initValues: TestExtendType) => {
      const newValues = { ...this.defaultValues, ...pick(initValues, Object.keys(this.defaultValues)) };
      this.values = newValues as TValues;
    },
    runLogic: () => {
      // Blank
    },
    resolveValues: () => {
      // Blank
    },
  };

  blankHook: () => {
    // Blank
  };

  propogationsAndShares?: PropogationsAndShares;

  constructor({
    name,
    defaultValues,
    hooks,
    allPlugins,
    propogationsAndShares,
  }: {
    name: string;
    defaultValues: TValues;
    hooks: Hooks;
    allPlugins: Plugins;
    propogationsAndShares?: PropogationsAndShares;
  }) {
    this.name = name;
    this.defaultValues = defaultValues;
    this.allPlugins = allPlugins;
    this.hooks = { ...this.hooks, ...hooks };
    this.propogationsAndShares = propogationsAndShares;
  }

  hook(name: keyof Hooks): (unknown) => void {
    try {
      if (Object.keys(this.hooks).includes(name)) {
        return this.hooks[name].bind(this);
      }
      return this.blankHook;
    } catch (error) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    return this.blankHook;
  }
}
