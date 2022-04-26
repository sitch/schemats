/* eslint-disable @typescript-eslint/naming-convention */

import { toGenericStruct, toGraphQLTypeDefs } from '@neo4j/introspector'
import fs from 'fs'
import { mkdirpSync } from 'fs-extra'
import { isString } from 'lodash'
import neo4j from 'neo4j-driver'
import path from 'path'

import { logger } from '../src/logger'
import type { Credentials } from './typing'
//------------------------------------------------------------------------------

const CREDENTIALS: Credentials = {
  host: 'localhost',
  schema: '',
  user: '',
  dir: process.env['NEO4J_SCHEMA_DIR'] || '.',
  database: process.env['NEO4J_DATABASE'] || '',
  username: process.env['NEO4J_USERNAME'] || '',
  password: process.env['NEO4J_PASSWORD'] || '',
  protocol: process.env['NEO4J_PROTOCOL'] || 'neo4j',
  port: process.env['NEO4J_PORT'] || '7687',
  readonly: true,
}

//------------------------------------------------------------------------------

const outputPaths = ({ dir, database }: Credentials) => ({
  schemaPath: `${dir}/graphql/${database}.graphql`,
  genericStructPath: `${dir}/graphql-json/${database}.json`,
})

const buildDriver = ({ database, port, protocol, username, password }: Credentials) => {
  if (!database || !port || !protocol) {
    logger.error('Missing :database, :port, or :protocol')
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }

  logger.info(`Connecting driver to: ${database}`)

  const uri = `${protocol}://localhost:${port}`
  logger.info(`Connecting to Neo4j uri: ${uri}`)

  if (username && isString(password)) {
    logger.info(`Using basic auth for user ${username}...`)
    return neo4j.driver(uri, neo4j.auth.basic(username, password))
  } else {
    logger.info(`Using no authentication...`)
    return neo4j.driver(uri)
  }
}

const driver = buildDriver(CREDENTIALS)

const sessionFactory = () => driver.session({ defaultAccessMode: neo4j.session.READ })

//------------------------------------------------------------------------------
// We create a async function here until "top level await" has landed
// so we can use async/await
//------------------------------------------------------------------------------
async function main({ readonly }: Credentials) {
  const { schemaPath, genericStructPath } = outputPaths(CREDENTIALS)

  logger.info('Creating dirs...')
  mkdirpSync(path.dirname(schemaPath))
  mkdirpSync(path.dirname(genericStructPath))

  logger.info('Introspecting Schema...')
  const typedefs = await toGraphQLTypeDefs(sessionFactory, readonly)

  logger.info(`Writing Schema types to: ${schemaPath}`)
  fs.writeFileSync(schemaPath, typedefs)

  logger.info('Introspecting GenericStruct...')
  const genericStruct = await toGenericStruct(sessionFactory)

  logger.info(`Writing GenericStruct types to: ${genericStructPath}`)
  fs.writeFileSync(genericStructPath, JSON.stringify(genericStruct, undefined, 2))

  await driver.close()
  logger.info('Done!')
}

void main(CREDENTIALS)
