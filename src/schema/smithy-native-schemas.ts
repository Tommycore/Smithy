import { Schema } from './schema-core';

export const ATOMIC_SCHEMAS_COLLECTION_NAME = 'Atomic' as const;
export const FOUNDRY_NATIVE_SCHEMAS_COLLECTION_NAME = 'Foundry' as const;

export const NATIVE_SCHEMAS: Record<string, readonly Schema[]> = {

    // ==============================================
  // Atomic Types
// ==============================================
  [ATOMIC_SCHEMAS_COLLECTION_NAME]: [

    // String
    {
      _id: '',
      label: 'string',
      description: 'Native type. Denotes a short text. ' +
        'During production, Smithy tries to use this as a loca key first. '+
        'If that yields no result, the content is used \'as is\'.',
    },

    // Text - A reference to markdown asset
    {
      _id: '',
      label: 'text',
      description: 'Native type. Denotes a longer text that is styled with markdown.',
    },

    // Integer
    {
      _id: '',
      label: 'int',
      description: 'Native type. A whole number (0, 1, 2, 3, -15, ...).',
    },

    // Decimal
    {
      _id: '',
      label: 'decimal',
      description: 'Native type. A real number (0, 1, 2.5, -3.14159265, 15.234e5, ...).',
    },

    // Boolean
    {
      _id: '',
      label: 'bool',
      description: 'Native type. A binary value, representing true/false, on/off, yes/no...',
    },
  ],

    // ==============================================
  // Foundry Native Types
// ==============================================
  [FOUNDRY_NATIVE_SCHEMAS_COLLECTION_NAME]: [

    // Document
    { 
      _id: '',
      label: 'Document',
      description: 'Base type for Foundry [documents](https://foundryvtt.com/api/classes/foundry.abstract.Document.html).',
      fields: [
        {
          key: 'name',
          label: 'Name',
          ref: 'Atomic.string',
          isRequired: true,
          default: 'New Document',
        },
        {
          key: '_id',
          label: 'id',
          ref: 'Atomic.string',
          isRequired: true,
        }
      ]
    },

    // JournalEntry
    {
      _id: '',
      label: 'JournalEntry',
      description: 'Basically a book. See [Journals](https://foundryvtt.com/article/journal/) on the [Foundry Knowledgebase](https://foundryvtt.com/kb/).',
      extends: 'Foundry.Document',
      fields: [
        {
          key: 'pages',
          label: 'Pages',
          ref: 'Foundry.JournalEntryPage',
          isArray: true,
        }
      ]
    },

    // JournalEntryPage
    {
      _id: '',
      label: 'JournalEntryPage',
      description: 'A page in a [Journal](https://foundryvtt.com/article/journal/).',
      extends: 'Foundry.Document',
      fields: [
        {
          key: 'content',
          label: 'Page Content',
          ref: 'Atomic.text',
        }
      ]
    },

    // RollableTable
    {
      _id: '',
      label: 'RollableTable',
      description: 'See [Rollable Tables](https://foundryvtt.com/article/roll-tables/) on the [Foundry Knowledgebase](https://foundryvtt.com/kb/).',
      extends: 'Foundry.Document',
    },
  ]
};