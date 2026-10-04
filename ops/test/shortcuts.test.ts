import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldIgnoreShortcut, transitionChord } from '../../kernel/shortcuts.ts'

test('shortcuts: shouldIgnoreShortcut 在表单和富文本输入态时严格短路', () => {
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'INPUT', isContentEditable: false, isComposing: false, hasModifier: false }),
    true
  )
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'TEXTAREA', isContentEditable: false, isComposing: false, hasModifier: false }),
    true
  )
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'SELECT', isContentEditable: false, isComposing: false, hasModifier: false }),
    true
  )
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'DIV', isContentEditable: true, isComposing: false, hasModifier: false }),
    true
  )
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'BODY', isContentEditable: false, isComposing: true, hasModifier: false }),
    true
  )
  assert.equal(
    shouldIgnoreShortcut({ tagName: 'BODY', isContentEditable: false, isComposing: false, hasModifier: false }),
    false
  )
})

test('shortcuts: transitionChord 状态机转移与路由匹配', () => {
  // 初始按下 'g'
  const step1 = transitionChord(null, 'g', 0)
  assert.equal(step1.nextChord, 'g')
  assert.equal(step1.isWaiting, true)
  assert.equal(step1.matchedRoute, null)

  // 1200ms 内按下 'h'
  const step2h = transitionChord('g', 'h', 300)
  assert.equal(step2h.nextChord, null)
  assert.equal(step2h.isWaiting, false)
  assert.equal(step2h.matchedRoute, '/')

  // 1200ms 内按下 'c'
  const step2c = transitionChord('g', 'c', 200)
  assert.equal(step2c.matchedRoute, '/checkup/')

  // 1200ms 内按下 'l'
  const step2l = transitionChord('g', 'l', 200)
  assert.equal(step2l.matchedRoute, '/tools/constitution/')

  // 超时重置测试：超过 1200ms 按下其他键
  const stepTimeout = transitionChord('g', 'h', 1500)
  assert.equal(stepTimeout.nextChord, null)
  assert.equal(stepTimeout.matchedRoute, null)
})
