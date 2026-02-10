import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import stripObject from '../utils/stripObject.js'

describe('stripObject', () => {
  describe('with undefined values', () => {
    it('should remove undefined properties', () => {
      const obj = { a: 1, b: undefined, c: 'test' }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: 1, c: 'test' })
    })

    it('should return undefined if all properties are undefined', () => {
      const obj = { a: undefined, b: undefined }
      const result = stripObject(obj)
      assert.equal(result, undefined)
    })

    it('should return the object if no properties are undefined', () => {
      const obj = { a: 1, b: 'test', c: true }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: 1, b: 'test', c: true })
    })
  })

  describe('with null and falsy values', () => {
    it('should not remove null values', () => {
      const obj = { a: null, b: 1 }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: null, b: 1 })
    })

    it('should not remove false values', () => {
      const obj = { a: false, b: 1 }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: false, b: 1 })
    })

    it('should not remove zero values', () => {
      const obj = { a: 0, b: 1 }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: 0, b: 1 })
    })

    it('should not remove empty string values', () => {
      const obj = { a: '', b: 1 }
      const result = stripObject(obj)
      assert.deepEqual(result, { a: '', b: 1 })
    })
  })

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const obj = {}
      const result = stripObject(obj)
      assert.equal(result, undefined)
    })

    it('should mutate the original object', () => {
      const obj = { a: 1, b: undefined }
      stripObject(obj)
      assert.deepEqual(obj, { a: 1 })
    })
  })
})
