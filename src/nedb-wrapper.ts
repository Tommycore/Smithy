import * as vsc from 'vscode';
import * as Collection from 'nedb';

export class NeDataBase {
  private _collections: Record<string, Collection> = {};

  public load<T>(collection: string, uri?: vsc.Uri) {
    if(this._collections[collection]) {
      return;
    }

    this._collections[collection] = new Collection<T>({
      autoload: true,
      filename: uri?.path.substring(1),
      timestampData: true,
    });
  }

  public hasCollection(collection: string) {
    return !!this._collections[collection];
  }

  public unload(collection: string) {
    if(this._collections[collection]) {
      delete this._collections[collection];
    }
  }

  public getCollectionList() {
    return Object.keys(this._collections);
  }

  public async get<T>(collection: string, query: any): Promise<T[]> {
    if(!this._collections[collection]) {
      return Promise.reject(`Collection '${collection}' does not exist.`);
    }

    return await new Promise<T[]>((resolve, reject) => {
      this._collections[collection].find<T>(query, (err: Error | null | undefined, documents: T[]) => {
        if(err) {
          reject(err);
        }
  
        resolve(documents);
      });
    });
  }

  public async getOne<T>(collection: string, query: any): Promise<T> {
    if(!this._collections[collection]) {
      return Promise.reject(`Collection '${collection}' does not exist.`);
    }

    return await new Promise<T>((resolve, reject) => {
      this._collections[collection].findOne<T>(query, (err: Error | null | undefined, document: T) => {
        if(err) {
          reject(err);
        }
  
        resolve(document);
      });
    });
  }

  public async write(collection: string, query: any, update: any, options?: {multi?: boolean, upsert?: boolean}): Promise<void> {
    if(!this._collections[collection]) {
      return Promise.reject(`Collection '${collection}' does not exist.`);
    }

    return await new Promise((resolve, reject) => {
      this._collections[collection].update(query, update, options, (err: Error | null | undefined) => {
        if(err) {
          reject(err);
        }

        resolve();
      });
    });
  }

  public async remove(collection: string, query: any, multi = false): Promise<number> {
    if(!this._collections[collection]) {
      return Promise.reject(`Collection '${collection}' does not exist.`);
    }

    return await new Promise((resolve, reject) => {
      this._collections[collection].remove(query, { multi }, (err: Error | null | undefined, n: number) => {
        if(err) {
          reject(err);
        }

        resolve(n);
      });
    });
  }

  public async count(collection: string, query: any): Promise<number> {
    if(!this._collections[collection]) {
      return Promise.reject(`Collection '${collection}' does not exist.`);
    }

    return await new Promise((resolve, reject) => {
      this._collections[collection].count(query, (err: Error | null | undefined, n: number) => {
        if(err) {
          reject(err);
        }

        resolve(n);
      });
    });
  }
}
