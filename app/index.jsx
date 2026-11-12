import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === 'authenticated' ? '/work' : '/login'} />;
}
