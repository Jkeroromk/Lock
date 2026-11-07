/**
 * App Review guideline 1.4.1 (calorie counters): an age requirement and a
 * "talk to a doctor first" disclaimer.
 */

/** Lock is for adults. Onboarding won't continue below this age. */
export const MIN_AGE = 18;

/** Set once the user has confirmed their age and read the health notice. */
export const healthAckKey = (userId: string) => `lock_health_ack_v1_${userId}`;

export const SUPPORT_EMAIL = 'support@jkeroro.com';
export const SITE = 'https://lock.jkeroro.com';
