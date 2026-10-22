/** Use neutral identifiers for legacy seed labels without changing stored account data. */
export function userLabel(user: { id: number; display_name: string }): string {
  const name = user.display_name.trim()
  return !name || ['我本人', '本人', '新增用户'].includes(name)
    ? `用户 ${String(user.id).padStart(3, '0')}`
    : name
}

export function isDismissed(error: unknown): boolean {
  return error === 'cancel' || error === 'close'
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
