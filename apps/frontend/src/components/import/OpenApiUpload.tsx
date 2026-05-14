'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { CreateTestConfigInput } from '@api-perf/shared';
import { cn } from '@/lib/utils';

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
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          loading && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the file here' : loading ? 'Parsing specification...' : 'Drop an OpenAPI spec here'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">JSON or YAML (OpenAPI 2.0 / 3.x)</p>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
