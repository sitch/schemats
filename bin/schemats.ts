#!/usr/bin/env node
import { version } from '../package.json'

import { Command } from 'commander'
import { postgres } from './schemats-postgres'
import { mysql } from './schemats-mysql'

const argv = process.argv
const program = new Command('schemats')

program.usage('[command]').version(version.toString())

postgres(program, argv)
mysql(program, argv)

program.parseAsync(argv)
