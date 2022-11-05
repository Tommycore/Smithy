import * as vsc from 'vscode';
import { TypeSchemeProvider } from './type-scheme-provider';
import { SchemaView } from './schema-view';
import { SchemaDB } from './schema-db';
import { registerSchemaCommands } from './schema-commands';

/** Files containing schema data are always stored under this name in the root of the workspace folder they belong to. */
export const SCHEMA_FILE_NAME = '.types' as const;

/** The file scheme schemas are using. */
export const TYPE_SCHEME = 'type';

/** Description of a type of data. */
export type Schema = {
  _id: string;
  label: string;
  fields?: SchemaField[];
  extends?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
};

/** More information on the specific properties of a field in a schema. */
type SchemaField = {
  ref?: string;
  key: string;
  label?: string;
  isRequired?: boolean;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  isArray?: boolean
};

/** Kick off the whole schema module. */
export async function initialiseSchemaModule(context: vsc.ExtensionContext) {
  await SchemaDB.initialise(context);
  new TypeSchemeProvider(context);
  new SchemaView(context);

  registerSchemaCommands(context);
}
