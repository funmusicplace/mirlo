const test = require('tape')
const path = require('path')
const Queue = require('bull')
const winston = require('winston')

require('dotenv-safe').config({ path: path.join(__dirname, '../../.env') })

const { optimizeImage: convertImageJob } = require('../../lib/jobs/convert-image')
const sharpConfig = require('../../lib/config/sharp')
const { REDIS_CONFIG } = require('../config/redis')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'upload' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.json()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
})

const queueOptions = {
  redis: REDIS_CONFIG
}

test('should convert artwork image to jpeg and webp', async t => {
  t.plan(1)

  const convertImageQueue = new Queue('convert-test', queueOptions)

  convertImageQueue.process(convertImageJob)

  convertImageQueue.on('completed', (job, result) => {
    logger.info('completed')
    t.pass('ok')
  })

  convertImageQueue.add({
    filename: 'a3291194671_16.jpg', // file in data/media/incoming
    config: sharpConfig.artwork
  })
})

test('should convert and resize image as cover with extract options', async t => {
  t.plan(1)

  const convertImageQueue = new Queue('convert-test-3', queueOptions)

  convertImageQueue.process(convertImageJob)

  convertImageQueue.on('completed', (job, result) => {
    logger.info('completed')
    t.pass('ok')
  })

  const coverConfig = Object.assign({}, sharpConfig.cover)

  // assign extract and other options dynamically
  for (const key of Object.keys(coverConfig)) {
    const variants = coverConfig[key].variants
    for (const item of variants) {
      item.extract = { top: 300, left: 0 }
    }
  }

  convertImageQueue.add({
    filename: '190122_Ellen-Tulum0200-Edit.jpg', // file in data/media/incoming
    config: coverConfig
  })
})
