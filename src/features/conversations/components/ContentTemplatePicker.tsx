'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { getContentTemplates, type ContentTemplate } from '@/lib/flex/actions/Conversation';

export function ContentTemplatePicker({ onPick }: { onPick: (body: string) => void }) {
  const t = useTranslations('conversations');
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  useEffect(() => { getContentTemplates().then(setTemplates).catch(() => {}); }, []);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted">{t('templates')}</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <Button key={tpl.sid} variant="secondary" onClick={() => onPick(tpl.body)}>{tpl.friendlyName}</Button>
        ))}
      </div>
    </div>
  );
}
