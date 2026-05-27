'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/lib/api';
import type { CreateTestConfigInput } from '@api-perf/shared';

interface Props {
  onParsed: (config: CreateTestConfigInput) => void;
}

export function OpenApiUpload({ onParsed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('spec', file);
      const result = await apiClient.postForm<CreateTestConfigInput>('/import/openapi', form);
      onParsed(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'], 'text/yaml': ['.yaml', '.yml'] },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 'var(--radius)',
          background: isDragActive ? 'color-mix(in oklch, var(--accent) 5%, var(--bg-1))' : 'var(--bg-1)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ marginBottom: 12, color: isDragActive ? 'var(--accent)' : 'var(--fg-2)' }}>
          <Icon name="up" size={32} />
        </div>
        <p style={{ fontWeight: 500, color: 'var(--fg-0)', margin: '0 0 4px' }}>
          {isDragActive ? 'Drop the file here' : loading ? 'Parsing specification…' : 'Drop an OpenAPI spec here'}
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: 0 }}>JSON or YAML · OpenAPI 2.0 / 3.x</p>
      </div>
      {error && (
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--err)' }}>{error}</p>
      )}
    </div>
  );
}
