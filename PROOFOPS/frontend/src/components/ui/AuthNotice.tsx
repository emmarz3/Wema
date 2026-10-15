import { motion } from 'motion/react';
import { NoticeBanner } from './States';

/**
 * Auth notice component for displaying session status messages.
 *
 * Used to inform users about:
 * - Expired sessions (reason: 'expired')
 * - Other auth-related notifications
 *
 * This component can be placed anywhere in the auth flow to provide
 * clear, consistent messaging about authentication state.
 */

export function AuthNotice({
  title,
  description,
  tone = 'warning',
}: {
  title: string;
  description: string;
  tone?: 'warning' | 'danger' | 'info';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-5"
    >
      <NoticeBanner tone={tone} title={title}>
        {description}
      </NoticeBanner>
    </motion.div>
  );
}

