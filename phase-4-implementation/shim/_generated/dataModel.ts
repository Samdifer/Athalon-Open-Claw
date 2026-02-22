export type Id<T extends string> = string & { __tableName: T };
