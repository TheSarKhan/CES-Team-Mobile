import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useLayout } from '../../src/lib/useLayout';
import { CardDetail } from '../../src/screens/CardDetail';

export default function CardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isWide } = useLayout();
  const status = useAuthStore((s) => s.status);
  if (status !== 'authenticated') return <Redirect href="/login" />;
  if (isWide) return <Redirect href={`/cards?c=${id}`} />;
  return <CardDetail id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace('/cards'))} />;
}
