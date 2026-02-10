import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Octopus from '../lib/Octopus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const testDir = join(__dirname, 'temp-test-data')

describe('Octopus', () => {
  before(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    mkdirSync(testDir, { recursive: true })
  })

  after(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('constructor', () => {
    it('should create an instance with required options', () => {
      const octopus = new Octopus({
        inputPath: 'properties.schema',
        inputId: 'test-component',
        cwd: testDir
      })
      assert.ok(octopus)
      assert.equal(octopus.inputId, 'test-component')
    })

    it('should use console as default logger', () => {
      const octopus = new Octopus({
        inputPath: 'properties.schema',
        inputId: 'test-component',
        cwd: testDir
      })
      assert.equal(octopus.logger, console)
    })

    it('should accept custom logger', () => {
      const customLogger = { log: () => {} }
      const octopus = new Octopus({
        inputPath: 'properties.schema',
        inputId: 'test-component',
        cwd: testDir,
        logger: customLogger
      })
      assert.equal(octopus.logger, customLogger)
    })
  })

  describe('#start()', () => {
    it('should throw error if no input path specified', async () => {
      const octopus = new Octopus({
        inputId: 'test-component',
        cwd: testDir
      })
      octopus.inputPath = null
      await assert.rejects(
        () => octopus.start(),
        { message: 'No input path specified' }
      )
    })

    it('should throw error if no ID specified', async () => {
      const inputPath = join(testDir, 'test.schema')
      writeFileSync(inputPath, JSON.stringify({ properties: {} }))
      const octopus = new Octopus({
        inputPath,
        cwd: testDir
      })
      await assert.rejects(
        () => octopus.start(),
        { message: 'No ID specified' }
      )
    })

    it('should load and parse input schema', async () => {
      const inputPath = join(testDir, 'test-load.schema')
      const schema = {
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      await octopus.start()
      assert.deepEqual(octopus.inputSchema, schema)
    })
  })

  describe('#convert()', () => {
    it('should handle component schema', async () => {
      const inputPath = join(testDir, 'component.schema')
      const schema = {
        $ref: 'http://localhost/plugins/content/component/model.schema',
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      await octopus.start()

      // Check that component schema was created (course schema won't be created with empty properties)
      const componentSchemaPath = join(testDir, 'schema', 'component.schema.json')
      assert.ok(existsSync(componentSchemaPath))
    })

    it('should handle theme schema', async () => {
      const inputPath = join(testDir, 'theme.schema')
      const schema = {
        $ref: 'http://localhost/plugins/content/theme/model.schema',
        properties: {
          variables: {
            primaryColor: { type: 'string' }
          }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-theme',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      await octopus.start()

      const themeSchemaPath = join(testDir, 'schema', 'theme.schema.json')
      assert.ok(existsSync(themeSchemaPath))
    })
  })

  describe('#construct()', () => {
    it('should create output schema with SchemaNode', async () => {
      const inputPath = join(testDir, 'construct-test.schema')
      const schema = {
        properties: {
          title: { type: 'string', title: 'Title' },
          body: { type: 'string', title: 'Body' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('component', schema)

      assert.ok(octopus.outputSchema)
      assert.equal(octopus.outputSchema.$anchor, 'test-component-component')
      assert.equal(octopus.outputSchema.$schema, 'https://json-schema.org/draft/2020-12/schema')
    })

    it('should handle empty properties', async () => {
      const inputPath = join(testDir, 'empty-test.schema')
      const schema = { properties: {} }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('component', schema)

      // Should not create output for empty properties
      assert.equal(octopus.outputSchema, undefined)
    })

    it('should handle course type with globals', async () => {
      const inputPath = join(testDir, 'globals-test.schema')
      const schema = {
        properties: {
          _id: { type: 'string' }
        },
        globals: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('course', schema)

      assert.ok(octopus.outputSchema)
      const properties = octopus.outputSchema.$merge?.with?.properties || octopus.outputSchema.$patch?.with?.properties
      assert.ok(properties)
      assert.ok(properties._globals)
    })
  })

  describe('#write()', () => {
    it('should write output schema to file', async () => {
      const inputPath = join(testDir, 'write-test.schema')
      const schema = {
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('component', schema)
      await octopus.write()

      const outputPath = join(testDir, 'schema', 'component.schema.json')
      assert.ok(existsSync(outputPath))

      const output = JSON.parse(readFileSync(outputPath, 'utf8'))
      assert.equal(output.$anchor, 'test-component-component')
    })

    it('should not overwrite existing schema', async () => {
      const inputPath = join(testDir, 'no-overwrite.schema')
      const schema = {
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const outputPath = join(testDir, 'schema', 'no-overwrite.schema.json')
      mkdirSync(dirname(outputPath), { recursive: true })
      const existingContent = '{"existing": true}'
      writeFileSync(outputPath, existingContent)

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('no-overwrite', schema)
      octopus.outputPath = outputPath
      await octopus.write()

      // Should keep existing content
      const content = readFileSync(outputPath, 'utf8')
      assert.equal(content, existingContent)
    })

    it('should log message when writing new schema', async () => {
      const inputPath = join(testDir, 'log-test.schema')
      const schema = {
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      const octopus = new Octopus({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      octopus.inputSchema = schema
      await octopus.construct('log-test', schema)
      await octopus.write()

      assert.ok(logs.some(log => log.includes('converted JSON schema written to')))
    })
  })

  describe('.run()', () => {
    it('should be a static method', () => {
      assert.equal(typeof Octopus.run, 'function')
    })

    it('should create instance and start conversion', async () => {
      const inputPath = join(testDir, 'component.model.schema')
      const schema = {
        properties: {
          title: { type: 'string' }
        }
      }
      writeFileSync(inputPath, JSON.stringify(schema))

      const logs = []
      await Octopus.run({
        inputPath,
        inputId: 'test-component',
        cwd: testDir,
        logger: { log: (msg) => logs.push(msg) }
      })

      const outputPath = join(testDir, 'schema', 'component.schema.json')
      assert.ok(existsSync(outputPath))
    })
  })
})
