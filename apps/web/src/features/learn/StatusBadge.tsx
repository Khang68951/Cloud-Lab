import type { ContentStatus } from '@cloudlab/shared';
import { CircleCheck, CircleDashed, Hammer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

const STYLE = {
  available: { tone: 'success', Icon: CircleCheck },
  'in-progress': { tone: 'info', Icon: Hammer },
  planned: { tone: 'neutral', Icon: CircleDashed },
} as const;

export function StatusBadge({ status }: { status: ContentStatus }) {
  const { t } = useTranslation();
  const { tone, Icon } = STYLE[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden />
      {t(`status.${status}`)}
    </Badge>
  );
}
