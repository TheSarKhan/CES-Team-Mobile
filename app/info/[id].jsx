import { useLocalSearchParams, useRouter } from 'expo-router';
import { ConversationInfo } from '../../src/screens/ConversationInfo';

// Qrup / şəxs məlumatı: ayrıca tam səhifə (WhatsApp kimi)
export default function InfoScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  return <ConversationInfo id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace(`/chats?c=${id}`))} />;
}
