import { useQuery } from '@tanstack/react-query';
import { cardsApi, registryApi } from '../api/endpoints';

export const ck = {
  types: ['card-types'],
  list: (p) => ['cards', p],
  card: (id) => ['card', String(id)],
  history: (id) => ['card-history', String(id)],
  summary: ['card-summary'],
};

export const useCardTypes = () => useQuery({ queryKey: ck.types, queryFn: cardsApi.types, staleTime: Infinity });

export const useCards = (params) => useQuery({ queryKey: ck.list(params), queryFn: () => cardsApi.list(params), staleTime: 15_000 });

export const useCard = (id) => useQuery({ queryKey: ck.card(id), queryFn: () => cardsApi.get(id), enabled: id != null, staleTime: 15_000 });

export const useCardHistory = (id, enabled = true) =>
  useQuery({ queryKey: ck.history(id), queryFn: () => cardsApi.history(id), enabled: enabled && id != null });

export const useCardSummary = () => useQuery({ queryKey: ck.summary, queryFn: cardsApi.summary, staleTime: 15_000 });

/** Reyestr (müştəri, texnika növü, öz texnikamız, podratçı, ərazi): seçim siyahısı; yeni dəyərlər kart saxlananda avtomatik əlavə olunur. */
export const useRegistry = (kind) =>
  useQuery({ queryKey: ['registry', kind], queryFn: () => registryApi.list(kind), enabled: !!kind, staleTime: 5 * 60_000 });

/** Növ tərifini tap. */
export const useDef = (type) => {
  const q = useCardTypes();
  return q.data?.find((d) => d.type === type);
};
