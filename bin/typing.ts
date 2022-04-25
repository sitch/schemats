// type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
// type Defaults<T> = Required<Pick<T, OptionalKeys<T>>>;

export interface Credentials {
  output?: string
  uri?: string
  dir: string
  host: string
  schema: string
  database: string
  user: string
  username: string
  password?: string
  protocol: string
  port: string
  readonly: boolean
}

// const defaults: Defaults<Credentials> = {
//   schema: 'public',
//   username: 'postgres',
//   password: 'postgres',
//   protocol: 'postgresql',
//   port: '5432',
//   readonly: true,
// };

// const postgraphile = (): Credentials => ({
//   dir: process.env.POSTGRES_SCHEMA_DIR || '.',
//   database: process.env.POSTGRES_DATABASE || '',
//   username: process.env.POSTGRES_USERNAME,
//   password: process.env.POSTGRES_PASSWORD || '',
//   protocol: process.env.POSTGRES_PROTOCOL || 'postgres',
//   schema: process.env.POSTGRES_SCHEMA || 'public',
//   port: process.env.POSTGRES_PORT || '5432',
//   readonly: true,
// });

// const postgres = (): Credentials => ({
//   dir: process.env.POSTGRES_SCHEMA_DIR || '.',
//   database: process.env.POSTGRES_DATABASE || '',
//   username: process.env.POSTGRES_USERNAME,
//   password: process.env.POSTGRES_PASSWORD || '',
//   protocol: process.env.POSTGRES_PROTOCOL || 'postgres',
//   schema: process.env.POSTGRES_SCHEMA || 'public',
//   port: process.env.POSTGRES_PORT || '5432',
//   readonly: true,
// });

// const mysql = (): Credentials => ({
//   dir: process.env.POSTGRES_SCHEMA_DIR || '.',
//   database: process.env.POSTGRES_DATABASE || '',
//   username: process.env.POSTGRES_USERNAME,
//   password: process.env.POSTGRES_PASSWORD || '',
//   protocol: process.env.POSTGRES_PROTOCOL || 'postgres',
//   schema: process.env.POSTGRES_SCHEMA || 'public',
//   port: process.env.POSTGRES_PORT || '5432',
//   readonly: true,
// });

// const neo4index = (): Credentials => ({
//   dir: process.env.POSTGRES_SCHEMA_DIR || '.',
//   database: process.env.POSTGRES_DATABASE || '',
//   username: process.env.POSTGRES_USERNAME,
//   password: process.env.POSTGRES_PASSWORD || '',
//   protocol: process.env.POSTGRES_PROTOCOL || 'postgres',
//   schema: process.env.POSTGRES_SCHEMA || 'public',
//   port: process.env.POSTGRES_PORT || '5432',
//   readonly: true,
// });
