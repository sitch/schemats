import { Logger } from 'tslog'

export const logger: Logger = new Logger({
  type: 'pretty',
  displayDateTime: true,
  displayLogLevel: true,
  displayLoggerName: true,
  displayFunctionName: true,
  // displayTypes: true,
})
