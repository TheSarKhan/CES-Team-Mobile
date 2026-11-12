import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useLayout } from '../../src/lib/useLayout';
import { ChatPane } from '../../src/screens/ChatPane';

// Mobil: tam ekran söhbət. Geniş web: 3 sütunlu görünüşə yönləndirilir.
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isWide } = useLayout();
  if (isWide) return <Redirect href={`/chats?c=${id}`} />;
  return <ChatPane id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace('/chats'))} />;
}
