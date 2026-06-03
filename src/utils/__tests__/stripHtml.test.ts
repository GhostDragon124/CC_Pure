import { describe, expect, test } from 'bun:test'
import { stripHtmlToText } from '../stripHtml.js'

describe('stripHtmlToText', () => {
  test('removes HTML tags', () => {
    expect(stripHtmlToText('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  test('decodes HTML entities', () => {
    expect(stripHtmlToText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      '<script>alert(1)</script>',
    )
  })

  test('removes script blocks', () => {
    expect(stripHtmlToText('<script>evil()</script>safe')).toBe('safe')
  })

  test('removes style blocks', () => {
    expect(stripHtmlToText('<style>body{}</style>text')).toBe('text')
  })

  test('handles empty input', () => {
    expect(stripHtmlToText('')).toBe('')
  })

  test('collapses excess whitespace', () => {
    expect(stripHtmlToText('a   b\n\n\nc')).toBe('a b\n\nc')
  })
})
