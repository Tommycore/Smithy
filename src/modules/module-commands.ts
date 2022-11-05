import * as vsc from 'vscode';
import * as util from '../util';
import { getManifest, Module } from './module';
import { MODULE_EXT } from './module-tracker';

/** Registration of commands in the vs code environment. */
export function registerModuleCommands(context: vsc.ExtensionContext) {
  context.subscriptions.push(vsc.commands.registerCommand('smithy.buildProject', buildProject));
}

async function buildProject(...args: any[]) {
  if(!args || args.length < 1 || typeof args[0] !== 'string' || !args[0].endsWith('.' + MODULE_EXT)) {
    return;
  }

  const uri = util.getUriFromRelativePathSync(args[0]);

  const module = await util.readObjectFromFile<Module>(uri);
  if(!module) {
    return;
  }

  const targetFolder = await vsc.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Export',
    title: 'Export Module'
  });

  if(!targetFolder) {
    return;
  }

  const rootFolder = vsc.Uri.joinPath(targetFolder[0], module.id);

  vsc.workspace.fs.writeFile(vsc.Uri.joinPath(rootFolder, 'module.json'), Buffer.from(JSON.stringify(getManifest(module), undefined, 2)));
}