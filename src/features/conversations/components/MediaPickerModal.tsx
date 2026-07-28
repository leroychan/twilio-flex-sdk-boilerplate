'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (file: File) => void;
}

const isImage = (f: File) => f.type.startsWith('image/');

/** Pick a file, preview it (image or name/size), and send it as a conversation attachment. */
export function MediaPickerModal({ open, onClose, onSend }: Props) {
  const t = useTranslations('conversations');
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isImage(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) setFile(null);
  }, [open]);

  if (!open) return null;

  const send = () => {
    if (!file) return;
    onSend(file);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label={t('media.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('media.title')}</h2>
        <input
          ref={inputRef}
          type="file"
          aria-label={t('media.choose')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 block w-full text-sm text-text"
        />
        {file && (
          <div className="mb-3 rounded-md border border-border p-2">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.name} className="max-h-48 w-auto" />
            ) : (
              <p className="text-sm text-muted">
                {t('media.fileMeta', { name: file.name, size: Math.ceil(file.size / 1024) })}
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('media.cancel')}
          </Button>
          <Button onClick={send} disabled={!file}>
            {t('media.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
