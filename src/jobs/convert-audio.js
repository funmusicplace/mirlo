const path = require('path')
const winston = require('winston')
const ffmpeg = require('fluent-ffmpeg')
const { promises: fs } = require('fs')

const BASE_DATA_DIR = process.env.BASE_DATA_DIR || '/'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'convert-audio' },
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

module.exports = async job => {
  const { filename } = job.data

  try {
    const result = await Promise.all([
      new Promise((resolve, reject) => {
        const profiler = logger.startTimer()
        logger.info('starting processing')
        return ffmpeg(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))
          .noVideo()
          .outputOptions('-movflags', '+faststart', '-f', 'ipod')
          .audioChannels(2)
          .audioBitrate('96k')
          .audioFrequency(48000)
          .audioCodec('libfdk_aac') // convert using Fraunhofer FDK AAC
          .on('start', () => logger.info('Converting original to m4a'))
          .on('error', err => {
            logger.error(err.message)
            return reject(err)
          })
          .on('end', async () => {
            profiler.done({ message: 'Done converting to m4a' })

            // FIXME: should this point to the trim track?
            const stat = await fs.stat(path.join(BASE_DATA_DIR, `/data/media/audio/trim-${filename}.m4a`))

            return resolve(stat)
          })
          .save(path.join(BASE_DATA_DIR, `/data/media/audio/${filename}.m4a`))
      }),
      new Promise((resolve, reject) => {
        const profiler = logger.startTimer()

        return ffmpeg(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))
          .noVideo()
          .inputOptions('-t', 45)
          .outputOptions('-movflags', '+faststart', '-f', 'ipod')
          .audioChannels(2)
          .audioBitrate('96k')
          .audioFrequency(48000)
          .audioCodec('libfdk_aac')
          .audioFilters([
            {
              filter: 'afade',
              options: {
                t: 'out',
                st: 43,
                d: 2
              }
            }
          ])
          .on('start', () => logger.info('Trimming track'))
          .on('error', err => {
            logger.error(err.message)
            return reject(err)
          })
          .on('end', async () => {
            profiler.done({ message: 'Done trimming track' })

            const stat = await fs.stat(path.join(BASE_DATA_DIR, `/data/media/audio/trim-${filename}.m4a`))

            return resolve(stat)
          })
          .save(path.join(BASE_DATA_DIR, `/data/media/audio/trim-${filename}.m4a`))
      })
    ])
    return Promise.resolve(result)
  } catch (err) {
    return Promise.reject(err)
  }
}
