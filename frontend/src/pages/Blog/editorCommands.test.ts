import { describe, expect, it } from 'vitest'
import { continueList, indentSelection, prefixSelectedLines, toggleInline, wrapSelection } from './editorCommands'

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

  it('inserts four spaces with Tab and indents or outdents multiline selections', () => {
    expect(indentSelection('const value = true', { start: 6, end: 6 })).toEqual({
      value: 'const     value = true', start: 10, end: 10,
    })

    const indented = indentSelection('one\ntwo', { start: 0, end: 7 })
    expect(indented.value).toBe('    one\n    two')
    expect(indentSelection(indented.value, { start: 0, end: indented.value.length }, true).value)
      .toBe('one\ntwo')
  })

  it('continues unordered, ordered and task lists on Enter', () => {
    expect(continueList('- first', { start: 7, end: 7 })).toEqual({
      value: '- first\n- ', start: 10, end: 10,
    })
    expect(continueList('9. ninth', { start: 8, end: 8 })).toEqual({
      value: '9. ninth\n10. ', start: 13, end: 13,
    })
    expect(continueList('- [x] done', { start: 10, end: 10 })?.value)
      .toBe('- [x] done\n- [ ] ')
  })

  it('exits a list when Enter is pressed on an empty item', () => {
    expect(continueList('before\n- ', { start: 9, end: 9 })).toEqual({
      value: 'before\n', start: 7, end: 7,
    })
  })
})
