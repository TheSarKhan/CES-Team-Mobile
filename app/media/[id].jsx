import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaGallery } from '../../src/screens/MediaGallery';

export default function MediaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  return <MediaGallery id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace(`/info/${id}`))} />;
}
