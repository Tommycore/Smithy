import * as vsc from 'vscode';
import { initialiseSchemaModule } from './schema/schema-core';
import { initialiseAssetModule } from './assets/asset-core';
import { initialiseQueryModule } from './queries/query-core';
import { initialiseModuleModule } from './modules/module-core';

export async function activate(context: vsc.ExtensionContext) {
  await initialiseSchemaModule(context);
  await initialiseAssetModule(context);
  await initialiseQueryModule(context);
  await initialiseModuleModule(context);

  // context.subscriptions.push(vsc.commands.registerCommand('smithy.foo', async () => {
  //   const files = await vsc.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false });
  //   if(!files || !(files[0] instanceof vsc.Uri) || !(files[0].path.endsWith('/template.json'))) {
  //     return;
  //   }

  //   const content = (await vsc.workspace.fs.readFile(files[0])).toString();
  //   const allDocumentTemplatesObject = JSON.parse(content);
  //   const normalisedObjects: Record<string, Record<string, any>> = {};
  //   for(const [documentCategory, documentContainerObject] of Object.entries(allDocumentTemplatesObject)) {
  //     const container: any = documentContainerObject;
  //     const categoryTemplates: any = container.templates;
      
  //     const catObj: Record<string, any> = {};
  //     normalisedObjects[documentCategory] = catObj;

  //     for(const docType of container.types) {
  //       const document: Record<string, any> = {};
  //       catObj[docType] = document;

  //       const docObj = container[docType];
  //       const usedTemplates: string[] = docObj.templates;


  //       for(const templateName of usedTemplates) {
  //         for(const [key, value] of Object.entries(categoryTemplates[templateName])) {
  //           document[key] = deepCopy(value);
  //         }
  //       }

        
  //       for(const [key, value] of Object.entries(docObj)) {
  //         if(key === 'templates') {
  //           continue;
  //         }

  //         document[key] = deepCopy(value);
  //       }
  //     }
  //   }
    
  //   vsc.workspace.openTextDocument({ content: JSON.stringify(normalisedObjects, undefined, 2), language: 'json' });
  // }));
}

export function deactivate() {}

// function deepCopy<T>(instance : T) : T {
//   if (instance === null){
//     return instance;
//   }

//   // handle Array types
//   if (instance instanceof Array){
//       var cloneArr = [] as any[];
//       (instance as any[]).forEach((value)  => {cloneArr.push(value);});
//       // for nested objects
//       return cloneArr.map((value: any) => deepCopy<any>(value)) as any;
//   }
//   // handle objects
//   if (instance instanceof Object) {
//       var copyInstance = { ...(instance as { [key: string]: any }
//       ) } as { [key: string]: any };
//       for (var attr in instance) {
//           if ( (instance as Object).hasOwnProperty(attr)) { 
//               copyInstance[attr] = deepCopy<any>((instance as any)[attr]);
//           }
//       }
//       return copyInstance as T;
//   }
//   // handling primitive data types
//   return instance;
// }
