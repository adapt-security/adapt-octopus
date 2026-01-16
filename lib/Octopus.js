import { EOL } from 'os'
import fs from 'fs/promises'
import path from 'path'
import SchemaNode from './SchemaNode.js'

export default class Octopus {
  static async run (opts) {
    await new Octopus(opts).start()
  }

  static async runRecursive (opts) {
    const _recurse = async pluginDir => {
      const hasNewSchemas = (await fs.readdir(path.join(pluginDir, 'schema'))).some(f => f.endsWith('.schema.json'))
      if (hasNewSchemas && opts.force !== true) {
        return
      }
      const bowerJson = JSON.parse(await fs.readFile(path.join(pluginDir, 'bower.json')))
      const inputId = bowerJson.component || bowerJson.extension || bowerJson.menu || bowerJson.theme
      const octopus = new Octopus({ ...opts, cwd: pluginDir, inputId })
      await octopus.start()
    }
    const { name } = JSON.parse(await fs.readFile(path.join(opts.cwd, 'package.json')))
    if (name !== 'adapt_framework') {
      return await _recurse(opts.cwd)
    }
    await Promise.all(['components', 'extensions', 'menu', 'theme'].map(async f => {
      try {
        const dir = path.join(opts.cwd, 'src', f)
        const contents = await fs.readdir(dir)
        return await Promise.all(contents.map(async c => _recurse(path.join(dir, c))))
      } catch (e) {}
    }))
  }

  logger
  inputPath
  outputPath
  inputId
  inputSchema
  outputSchema

  constructor ({ inputPath = 'properties.schema', inputId, cwd, logger = console }) {
    this.cwd = cwd || path.basename(inputPath)
    this.inputPath = path.resolve(cwd, inputPath)
    this.inputId = inputId
    this.logger = logger
  }

  async start () {
    if (!this.inputPath) throw (new Error('No input path specified'))
    if (!this.inputId) throw (new Error('No ID specified'))

    this.inputSchema = JSON.parse(await fs.readFile(this.inputPath, 'utf8'))
    await this.convert()
  }

  async convert () {
    const properties = this.inputSchema.properties
    if (this.inputSchema.$ref === 'http://localhost/plugins/content/component/model.schema') {
      await this.construct('course', {})
      await this.construct('component')
      return
    }
    if (this.inputSchema.$ref === 'http://localhost/plugins/content/theme/model.schema') {
      await this.construct('theme', { properties: properties.variables })
    }
    if (properties?.pluginLocations) return await this.iterateLocations()
    await this.construct(path.basename(this.inputPath, '.model.schema'))
  }

  async iterateLocations () {
    const locations = this.inputSchema.properties.pluginLocations.properties

    for (const location of Object.entries(locations)) {
      await this.construct(...location)
    }

    // ensure any globals are converted
    if (!Object.keys(locations).includes('course')) {
      await this.construct('course', {})
    }
  }

  async construct (type, schema = this.inputSchema) {
    const properties = schema.properties

    if (type !== 'course' || !(schema.globals || (schema.globals = this.inputSchema.globals))) {
      if (!properties || !Object.keys(properties).length) return
      delete schema.globals
    }

    this.outputSchema = new SchemaNode({
      nodeType: 'root',
      schemaType: type,
      inputId: this.inputId,
      inputSchema: schema,
      logger: this.logger
    })

    this.outputPath = path.resolve(this.cwd, `schema/${type}.schema.json`)
    await this.write()
  }

  async write () {
    try {
      return await fs.readFile(this.outputPath)
      // return this.logger.log(`JSON schema already exists at ${this.outputPath}, exiting`);
    } catch (e) {
      // carry on
    }
    const json = JSON.stringify(this.outputSchema, null, 2) + EOL

    await fs.mkdir(path.dirname(this.outputPath), { recursive: true })
    await fs.writeFile(this.outputPath, json)
    this.logger.log(`converted JSON schema written to ${this.outputPath}`)
  }
}
