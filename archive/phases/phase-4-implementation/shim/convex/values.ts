export const v = {
  string: () => ({ type: 'string' }),
  number: () => ({ type: 'number' }),
  boolean: () => ({ type: 'boolean' }),
  optional: (x: any) => ({ type: 'optional', of: x }),
  id: (table: string) => ({ type: 'id', table }),
  array: (x: any) => ({ type: 'array', of: x }),
  union: (...args: any[]) => ({ type: 'union', of: args }),
  literal: (x: any) => ({ type: 'literal', value: x }),
  object: (x: any) => ({ type: 'object', fields: x }),
  null: () => ({ type: 'null' }),
};
