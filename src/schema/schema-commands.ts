import * as vsc from 'vscode';
import { SchemaDB } from './schema-db';
import { TypeSchemeProvider as TSP } from './type-scheme-provider';

/** Registration of commands in the vs code environment. */
export function registerSchemaCommands(context: vsc.ExtensionContext) {
  context.subscriptions.push(vsc.commands.registerCommand('smithy.createSchema', createSchema));
  context.subscriptions.push(vsc.commands.registerCommand('smithy.deleteSchema', deleteSchema));
}

async function deleteSchema(...args: any[]) {
  if(!args[0] || !(args[0] instanceof vsc.Uri) || !TSP.isSchema(args[0])) {
    return;
  }

  const collection = args[0].authority;
  const id = TSP.schemaIdFromUri(args[0]);

  SchemaDB.removeSchema(collection, id)
    .then(() => vsc.commands.executeCommand('smithy.refreshSchemaView'))
    .catch(reason => vsc.window.showErrorMessage(`Unable to remove Schema '${id}' from '${collection}': ${reason}`));
}

/**
 * Asks user about a collection and a name and then creates a new schema with the given input.
 * @param args Should be an {@link vsc.Uri | uri} using the {@link TSP | type scheme},
 * pointing to the collection to which the new schema should be added.
 * If empty or of wrong type, the extension attempts to ask the use for the correct collection.
 */
async function createSchema(...args: any[]) {
  let collection: string | undefined = undefined;
  
  if(!args[0] || !(args[0] instanceof vsc.Uri)) {
    collection = await pickWorkspaceFolder('Add schema to which layer?');
  }
  else {
    collection = args[0].authority;
  }
  
  if(!collection) {
    return;
  }

  const name = await vsc.window.showInputBox({
    prompt: 'Please name your new schema',
    title: 'Schema name'
  });

  if(!name) {
    return;
  }
  
  SchemaDB.createEmptySchema(collection, name)
    .then(() => vsc.commands.executeCommand('smithy.refreshSchemaView'))
    .catch(reason => vsc.window.showErrorMessage(`Unable to create Schema '${name}' in '${collection}': ${reason}`));
}

const openFolderOptions: Record<string, string> = {
  'Open Folder': 'workbench.action.files.openFolder' as const,
  'Add Folder': 'workbench.action.addRootFolder' as const
} as const;
async function requestUserToOpenWorkspaceFolder() {
  const action = await vsc.window.showWarningMessage('You need at least one workspace folder in your project.', ...Object.keys(openFolderOptions));
  if(action) {
    vsc.commands.executeCommand(openFolderOptions[action]);
  }
}

async function pickWorkspaceFolder(label: string = 'Please pick a workspace folder') {
  if(!vsc.workspace.workspaceFolders) {
    requestUserToOpenWorkspaceFolder();
    return;
  }

  if(vsc.workspace.workspaceFolders.length === 1) {
    return vsc.workspace.workspaceFolders[0].name;
  }

  const folders = vsc.workspace.workspaceFolders.map(folder => folder.name);
  
  return await vsc.window.showQuickPick(folders, { title: label });
}