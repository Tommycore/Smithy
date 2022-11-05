import * as vsc from 'vscode';
import { QueryTracker } from './query-tracker';

export async function initialiseQueryModule(context: vsc.ExtensionContext) {
  const queryTracker = await QueryTracker.initialise(context);
}