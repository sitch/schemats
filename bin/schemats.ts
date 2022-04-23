#!/usr/bin/env node
import { Command } from 'commander'

import { version } from '../package.json'
import { mysql } from './schemats-mysql'
import { neo4j } from './schemats-neo4j'
import { postgres } from './schemats-postgres'

const argv = process.argv
const program = new Command('schemats')

program.usage('[command]').version(version.toString())

postgres(program, argv)
mysql(program, argv)
neo4j(program, argv)

void program.parseAsync(argv)
