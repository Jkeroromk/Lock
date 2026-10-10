import { useLocalSearchParams } from 'expo-router';
import LegalDocument from '@/components/legal/LegalDocument';

// Public route (no sign-in needed) so the login screen can link to the
// terms and privacy policy: /legal/terms, /legal/privacy
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  return <LegalDocument kind={doc === 'privacy' ? 'privacy' : 'terms'} />;
}
