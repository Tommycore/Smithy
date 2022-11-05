import * as vsc from 'vscode';
import { NeDataBase } from '../nedb-wrapper';
import { NATIVE_SCHEMAS } from './smithy-native-schemas';
import { Schema, SCHEMA_FILE_NAME } from './schema-core';
import { randomUUID } from 'crypto';
const uuid5 = require('uuid5');

export class SchemaDB {
  private constructor(private _context: vsc.ExtensionContext) {
    SchemaDB._instance = this;
  }

  private static _instance?: SchemaDB;
  private _db = new NeDataBase();
  private _watchers: Record<string, vsc.FileSystemWatcher> = {};

  public static async initialise(context: vsc.ExtensionContext) {
    new SchemaDB(context);

    // We just set the instance in the constructor, so using ! should be ok here.
    await SchemaDB._instance!._initialiseNativeSchemas();
    
    // Watch active WSF for schema collections.
    if(vsc.workspace.workspaceFolders) {

      await Promise.all(vsc.workspace.workspaceFolders.map(async folder => {
        if(!SchemaDB._instance) {
          return Promise.reject('SchemaDB is not initialised.');
        }
        await SchemaDB._instance._addWorkspaceFolder(folder);
      }));
    }

    // Start/Stop watching when the workspace folder composition is changed.
    context.subscriptions.push(vsc.workspace.onDidChangeWorkspaceFolders(async e => {
      await Promise.all(e.added.map(async folder => {
        if(!SchemaDB._instance) {
          return Promise.reject('SchemaDB is not initialised.');
        }
        await SchemaDB._instance._addWorkspaceFolder(folder);
      }));
      await Promise.all(e.removed.map(async folder => {
        if(!SchemaDB._instance) {
          return Promise.reject('SchemaDB is not initialised.');
        }
        await SchemaDB._instance._removeWorkspaceFolder(folder);
      }));
    }));
  }

  private async _initialiseNativeSchemas() {
    await Promise.all(Object.keys(NATIVE_SCHEMAS).map(async col => {
      this._db.load<Schema>(col);
      await Promise.all(NATIVE_SCHEMAS[col].map(schema => this._insertSmithyNativeSchema(col, schema)));
    })); 
  }

  private async _insertSmithyNativeSchema(collection: string, schema: Schema) {
    schema._id = uuid5(schema.label);
    return this._db.write(collection, schema , schema, { upsert: true });
  }

  private _startWatchingWorkspaceFolder(folder: vsc.WorkspaceFolder) {
    this._watchers[folder.name] = vsc.workspace.createFileSystemWatcher(new vsc.RelativePattern(folder, SCHEMA_FILE_NAME), false, true, false);
    this._watchers[folder.name].onDidCreate(() => this._addSchemaCollection(folder));
    this._watchers[folder.name].onDidDelete(() => this._unloadSchemaCollection(folder));
    
    this._context.subscriptions.push(this._watchers[folder.name]);
  }

  private _stopWatchingWorkspaceFolder(folder: vsc.WorkspaceFolder) {
    if(this._watchers[folder.name]) {
      this._watchers[folder.name].dispose();
      delete this._watchers[folder.name];
    }
  }

  private async _hasSchemaCollection(folder: vsc.WorkspaceFolder) {
    try {
      const fileStat = await vsc.workspace.fs.stat(vsc.Uri.joinPath(folder.uri, SCHEMA_FILE_NAME));
      return fileStat.type & vsc.FileType.File;
    }
    catch(e) {
      return false;
    }
  }

  private async _addWorkspaceFolder(folder: vsc.WorkspaceFolder) {
    if(await this._hasSchemaCollection(folder)) {
      this._addSchemaCollection(folder);
    }

    this._startWatchingWorkspaceFolder(folder);
  }

  private async _removeWorkspaceFolder(folder: vsc.WorkspaceFolder) {
    this._unloadSchemaCollection(folder);
    this._stopWatchingWorkspaceFolder(folder);
  }

  private _addSchemaCollection(folder: vsc.WorkspaceFolder) {
    this._db.load<Schema>(folder.name, vsc.Uri.joinPath(folder.uri, SCHEMA_FILE_NAME));
    vsc.commands.executeCommand('smithy.refreshSchemaView');
  }

  private _unloadSchemaCollection(folder: vsc.WorkspaceFolder) {
    this._db.unload(folder.name);
    vsc.commands.executeCommand('smithy.refreshSchemaView');
  }

  public static getAllSchemaCollections() {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    return SchemaDB._instance._db.getCollectionList();
  }

  public static isNativeSchemaCollection(collection: string) {
    return Object.keys(NATIVE_SCHEMAS).includes(collection);
  }

  public static async count(collection: string, query: any) {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    return await SchemaDB._instance._db.count(collection, query);
  }

  public static async isExisting(collection: string, query: any) {
    return (await SchemaDB.count(collection, query)) > 0;
  }

  public static async getSchema(collection: string, id: string): Promise<Schema | undefined> {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    return await SchemaDB._instance._db.getOne(collection, {_id: id});
  }

  public static async getSchemaByLabel(collection: string, label: string): Promise<Schema | undefined> {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    return await SchemaDB._instance._db.getOne(collection, {label});
  }

  public static async setSchema(collection: string, schema: Schema, create?: boolean, force?: boolean): Promise<void> {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    if(!SchemaDB._instance._db.hasCollection(collection)) {
      if(create && vsc.workspace.workspaceFolders) {
        const wsf = vsc.workspace.workspaceFolders.find(wsf => wsf.name === collection);
        if(!wsf) {
          return Promise.reject(`Schema collection '${collection}' does not exist.`);
        }
        await vsc.workspace.fs.writeFile(vsc.Uri.joinPath(wsf.uri, SCHEMA_FILE_NAME), Buffer.from(''));
      }
      let attempts = 5;
      let hasCollection = false;
      while(attempts > 0 && !hasCollection) {
        hasCollection = !!(await new Promise<boolean>(resolve => {
          setTimeout(() => {
            attempts--;
            resolve(SchemaDB._instance!._db.hasCollection(collection));
          }, 25);
        }));
      }
      if(!hasCollection) {
        return Promise.reject(`Schema collection '${collection}' does not exist.`);
      }
    }

    const hasSchema = (await SchemaDB._instance._db.count(collection, { $or: [{ _id: schema._id }, { label: schema.label }]})) !== 0;

    if(hasSchema && !force) {
      return Promise.reject(`'${schema.label}' already exists. To overwrite it, set the force flag to true.`);
    }
    if(!hasSchema && !create) {
      return Promise.reject(`'${schema.label}' doesn't exist. To create it, set the create flag to true.`);
    }

    return SchemaDB._instance._db.write(collection, { _id: schema._id }, schema, {multi: false, upsert: true});
  }

  public static async createEmptySchema(collection: string, label: string) {
    SchemaDB.setSchema(collection, { _id: randomUUID(), label }, true, false);
  }

  public static async removeSchema(collection: string, idOrlabel: string) {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    
    return SchemaDB._instance._db.remove(collection, { $or: [{ _id: idOrlabel }, { label: idOrlabel }]});
  }

  public static async getAllSchemasFromCollection(collection: string) {
    if(!SchemaDB._instance) {
      return Promise.reject('SchemaDB is not initialised.');
    }
    return SchemaDB._instance._db.get<Schema>(collection, {});
  }
}