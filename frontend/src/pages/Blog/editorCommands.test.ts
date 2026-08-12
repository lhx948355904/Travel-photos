import { describe, expect, it } from 'vitest'
import { prefixSelectedLines, toggleInline, wrapSelection } from './editorCommands'

describe('Markdown editor commands', () => {
  it('toggles bold without nesting markers', () => {
    const applied = toggleInline('hello world', { start: 6, end: 11 }, '**')
    expect(applied).toEqual({ value: 'hello **world**', start: 8, end: 13 })

    expect(toggleInline(applied.value, { start: applied.start, end: applied.end }, '**')).toEqual({
      value: 'hello world', start: 6, end: 11,
    })
  })

  it('removes formatting when the complete Markdown token is selected', () => {
    expect(toggleInline('**world**', { start: 0, end: 9 }, '**')).toEqual({
      value: 'world', start: 0, end: 5,
    })
  })

  it('keeps surrounding whitespace outside bold markers so Markdown can render it', () => {
    expect(toggleInline('协议： 是通过TCP ', { start: 4, end: 11 }, '**')).toEqual({
      value: '协议： **是通过TCP** ', start: 6, end: 12,
    })
  })

  it('uses a selected value or placeholder for wrapped commands', () => {
    expect(wrapSelection('', { start: 0, end: 0 }, '[', '](https://)', '链接文字')).toEqual({
      value: '[链接文字](https://)', start: 1, end: 5,
    })
  })

  it('prefixes every selected line for list commands', () => {
    expect(prefixSelectedLines('one\ntwo', { start: 0, end: 7 }, (index) => `${index + 1}. `).value)
      .toBe('1. one\n2. two')
  })
})
