/**
 * A one-time "not medical advice, talk to a doctor first" notice (App Review 1.4.1).
 */

/** Set once the user has read the health notice. */
export const healthAckKey = (userId: string) => `lock_health_ack_v1_${userId}`;

export const SUPPORT_EMAIL = 'support@jkeroro.com';
export const SITE = 'https://lock.jkeroro.com';
