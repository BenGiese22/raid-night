import { vi } from 'vitest'

// React Testing Library's asyncWrapper detects fake timers by checking
// `typeof jest !== 'undefined'`. Vitest's globals mode doesn't expose a `jest`
// global, so RTL falls back to a real setTimeout inside its drain Promise —
// which hangs forever when fake timers are active.
//
// Mapping `globalThis.jest` to `vi` lets RTL call `jest.advanceTimersByTime(0)`
// to drain that internal timer, unblocking userEvent clicks in fake-timer tests.
//
// See: https://github.com/testing-library/react-testing-library/issues/1198
Object.defineProperty(globalThis, 'jest', {
  value: vi,
  writable: true,
  configurable: true,
})
