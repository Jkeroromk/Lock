/**
 * Admin accounts (the app's own team) never hit AI limits, so testing doesn't
 * eat into a free allowance. Set ADMIN_USER_IDS in Vercel to a comma-separated
 * list of user IDs (Clerk IDs, the same as users.id).
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}
