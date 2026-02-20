import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import SchemaNode from '../lib/SchemaNode.js'

describe('SchemaNode', () => {
  describe('constructor with nodeType: root', () => {
    let result

    before(() => {
      const options = {
        nodeType: 'root',
        schemaType: 'config',
        inputId: 'adapt-test',
        inputSchema: {
          properties: {
            title: { type: 'string', required: true },
            body: { type: 'string' }
          }
        },
        logger: { log: () => {} }
      }
      result = new SchemaNode(options)
    })

    it('should create a root schema with $anchor', () => {
      assert.equal(result.$anchor, 'adapt-test-config')
    })

    it('should have $schema property', () => {
      assert.equal(result.$schema, 'https://json-schema.org/draft/2020-12/schema')
    })

    it('should have type object', () => {
      assert.equal(result.type, 'object')
    })

    it('should have $patch for extension schemas', () => {
      assert.ok(result.$patch)
      assert.equal(result.$patch.source.$ref, 'config')
    })

    it('should have properties in $patch.with', () => {
      assert.ok(result.$patch.with.properties)
    })
  })

  describe('constructor with nodeType: root (core component)', () => {
    let result

    before(() => {
      const options = {
        nodeType: 'root',
        schemaType: 'component',
        inputId: 'component',
        inputSchema: {
          properties: {
            title: { type: 'string' }
          }
        },
        logger: { log: () => {} }
      }
      result = new SchemaNode(options)
    })

    it('should use $merge for core components', () => {
      assert.ok(result.$merge)
      assert.equal(result.$merge.source.$ref, 'content')
    })

    it('should have correct $anchor for core component', () => {
      assert.equal(result.$anchor, 'component')
    })
  })

  describe('constructor with nodeType: properties', () => {
    let result

    before(() => {
      const options = {
        nodeType: 'properties',
        key: 'title',
        inputSchema: {
          type: 'string',
          title: 'Title',
          help: 'The title text',
          default: '',
          translatable: true
        },
        logger: { log: () => {} }
      }
      result = new SchemaNode(options)
    })

    it('should have correct type', () => {
      assert.equal(result.type, 'string')
    })

    it('should have title', () => {
      assert.equal(result.title, 'Title')
    })

    it('should have description from help', () => {
      assert.equal(result.description, 'The title text')
    })

    it('should have default value', () => {
      assert.equal(result.default, '')
    })

    it('should have _adapt options', () => {
      assert.deepEqual(result._adapt, { translatable: true })
    })
  })

  describe('#getType()', () => {
    it('should return the type for regular types', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string' },
        logger: { log: () => {} }
      })
      assert.equal(node.type, 'string')
    })

    it('should keep objectid type and set isObjectId flag', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'objectid' },
        logger: { log: () => {} }
      })
      assert.equal(node.type, 'objectid')
      assert.equal(node.isObjectId, true)
    })
  })

  describe('#getTitle()', () => {
    it('should return title if provided', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', title: 'Custom Title' },
        logger: { log: () => {} }
      })
      assert.equal(node.title, 'Custom Title')
    })

    it('should return legend if title not provided', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', legend: 'Legend Text' },
        logger: { log: () => {} }
      })
      assert.equal(node.title, 'Legend Text')
    })

    it('should generate title from key', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'displayTitle',
        inputSchema: { type: 'string' },
        logger: { log: () => {} }
      })
      assert.equal(node.title, 'Display title')
    })

    it('should handle underscores in key', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'user_name',
        inputSchema: { type: 'string' },
        logger: { log: () => {} }
      })
      assert.equal(node.title, 'Username')
    })
  })

  describe('#getDefault()', () => {
    it('should return explicit default if provided', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', default: 'custom' },
        logger: { log: () => {} }
      })
      assert.equal(node.default, 'custom')
    })

    it('should return empty string for non-required string', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string' },
        logger: { log: () => {} }
      })
      assert.equal(node.default, '')
    })

    it('should return 0 for non-required number', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'number' },
        logger: { log: () => {} }
      })
      assert.equal(node.default, 0)
    })

    it('should return false for non-required boolean', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'boolean' },
        logger: { log: () => {} }
      })
      assert.equal(node.default, false)
    })

    it('should return empty object for non-required object', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'object' },
        logger: { log: () => {} }
      })
      assert.deepEqual(node.default, {})
    })

    it('should return empty array for non-required array without items', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'array' },
        logger: { log: () => {} }
      })
      assert.deepEqual(node.default, [])
    })

    it('should not return default for required fields', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', required: true },
        logger: { log: () => {} }
      })
      assert.equal(node.default, undefined)
    })

    it('should not return default for ObjectId fields', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'objectid' },
        logger: { log: () => {} }
      })
      assert.equal(node.default, undefined)
    })
  })

  describe('#getIsObjectId()', () => {
    it('should return true for objectid type', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'objectid' },
        logger: { log: () => {} }
      })
      assert.equal(node.isObjectId, true)
    })

    it('should return true for Asset inputType', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', inputType: 'Asset:image' },
        logger: { log: () => {} }
      })
      assert.equal(node.isObjectId, true)
    })

    it('should return undefined for regular types', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string' },
        logger: { log: () => {} }
      })
      assert.equal(node.isObjectId, undefined)
    })
  })

  describe('#getRequiredFields()', () => {
    it('should return required field names', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'test',
        inputId: 'test',
        inputSchema: {
          properties: {
            title: { type: 'string', required: true },
            body: { type: 'string' },
            subtitle: { type: 'string', validators: ['required'] }
          }
        },
        logger: { log: () => {} }
      })
      // For root nodes, required is in $merge.with.required (core) or $patch.with.required (extension)
      const required = node.$merge?.with?.required || node.$patch?.with?.required
      assert.deepEqual(required, ['title', 'subtitle'])
    })

    it('should exclude fields with default values', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'test',
        inputId: 'test',
        inputSchema: {
          properties: {
            title: { type: 'string', required: true, default: 'test' },
            body: { type: 'string', required: true }
          }
        },
        logger: { log: () => {} }
      })
      const required = node.$merge?.with?.required || node.$patch?.with?.required
      assert.deepEqual(required, ['body'])
    })

    it('should return undefined if no required fields', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'test',
        inputId: 'test',
        inputSchema: {
          properties: {
            title: { type: 'string' },
            body: { type: 'string' }
          }
        },
        logger: { log: () => {} }
      })
      const required = node.$merge?.with?.required || node.$patch?.with?.required
      assert.equal(required, undefined)
    })
  })

  describe('#getProperties()', () => {
    it('should return undefined if no properties or globals', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'test',
        inputId: 'test',
        inputSchema: {},
        logger: { log: () => {} }
      })
      const properties = node.$merge?.with?.properties || node.$patch?.with?.properties || node.properties
      assert.equal(properties, undefined)
    })

    it('should convert properties to SchemaNode instances', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'test',
        inputId: 'test',
        inputSchema: {
          properties: {
            title: { type: 'string' }
          }
        },
        logger: { log: () => {} }
      })
      const properties = node.$merge?.with?.properties || node.$patch?.with?.properties
      assert.ok(properties.title)
      assert.equal(properties.title.type, 'string')
    })

    it('should handle globals', () => {
      const node = new SchemaNode({
        nodeType: 'root',
        schemaType: 'course',
        inputId: 'test-plugin',
        inputSchema: {
          globals: {
            title: { type: 'string', default: 'Global Title' }
          }
        },
        logger: { log: () => {} }
      })
      const properties = node.$merge?.with?.properties || node.$patch?.with?.properties
      assert.ok(properties._globals)
      assert.equal(properties._globals.type, 'object')
      assert.ok(properties._globals.properties['_test-plugin'])
    })
  })

  describe('#getEnumeratedValues()', () => {
    it('should return originalEnum if provided', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', originalEnum: ['a', 'b', 'c'] },
        logger: { log: () => {} }
      })
      assert.deepEqual(node.enum, ['a', 'b', 'c'])
    })

    it('should return Select options', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'string', inputType: { type: 'Select', options: ['x', 'y'] } },
        logger: { log: () => {} }
      })
      assert.deepEqual(node.enum, ['x', 'y'])
    })
  })

  describe('#getAdaptOptions()', () => {
    it('should return adapt options', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: {
          type: 'string',
          editorOnly: true,
          isSetting: true,
          translatable: true
        },
        logger: { log: () => {} }
      })
      assert.deepEqual(node._adapt, {
        editorOnly: true,
        isSetting: true,
        translatable: true
      })
    })

    it('should strip undefined values', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: {
          type: 'string',
          translatable: true
        },
        logger: { log: () => {} }
      })
      assert.deepEqual(node._adapt, { translatable: true })
    })
  })

  describe('constructor with nodeType: items', () => {
    it('should handle items with properties', () => {
      const node = new SchemaNode({
        nodeType: 'items',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' }
          }
        },
        logger: { log: () => {} }
      })
      assert.equal(node.type, 'object')
      assert.ok(node.properties)
      assert.ok(node.properties.label)
      assert.ok(node.properties.value)
    })

    it('should handle items without properties', () => {
      const node = new SchemaNode({
        nodeType: 'items',
        inputSchema: {},
        logger: { log: () => {} }
      })
      assert.equal(node.type, 'object')
      assert.equal(node.properties, undefined)
    })
  })

  describe('#getItems()', () => {
    it('should return items SchemaNode if items exist', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' }
            }
          }
        },
        logger: { log: () => {} }
      })
      assert.ok(node.items)
      assert.equal(node.items.type, 'object')
    })

    it('should return undefined if no items', () => {
      const node = new SchemaNode({
        nodeType: 'properties',
        key: 'test',
        inputSchema: { type: 'array' },
        logger: { log: () => {} }
      })
      assert.equal(node.items, undefined)
    })
  })
})
