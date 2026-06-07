// STUB: 待补全 — 见 docs/devlog/02-tsc-stubs.md
// Design-system Dialog component.
// Imported by MonitorMcpTask dialogs for rendering modal overlay dialogs.
// Stub: renders children in a minimal container.

import React from 'react'

type DialogProps = {
  children?: React.ReactNode
  title?: string
  subtitle?: React.ReactNode
  onCancel?: () => void
  inputGuide?: () => React.ReactNode
}

export function Dialog({ children, title: _title, subtitle: _subtitle, onCancel: _onCancel, inputGuide: _inputGuide }: DialogProps): React.ReactNode {
  return <>{children}</>
}
