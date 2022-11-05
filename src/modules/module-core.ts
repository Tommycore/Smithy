import * as vsc from 'vscode';
import { registerModuleCommands } from './module-commands';
import { ModuleTracker } from './module-tracker';

export async function initialiseModuleModule(context: vsc.ExtensionContext) {
  await ModuleTracker.initialise(context);
  registerModuleCommands(context);
}