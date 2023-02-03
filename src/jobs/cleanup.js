const { promises: fs } = require('fs')
const winston = require('winston')
const path = require('path')

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'cleanup' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
})

/**
 * Cleanup incoming folder and more (later)
 */

const cleanupJob = async (job) => {
  try {
    await fs.unlink(path.join(BASE_DATA_DIR, `/data/media/incoming/${job.data.filename}`))

    logger.info('file removed')

    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}

export default cleanupJob
