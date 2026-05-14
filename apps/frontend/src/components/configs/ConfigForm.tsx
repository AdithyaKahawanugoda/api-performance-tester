'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTestConfigSchema, type CreateTestConfigInput } from '@api-perf/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  defaultValues?: Partial<CreateTestConfigInput>;
  onSubmit: (data: CreateTestConfigInput) => void;
  isLoading?: boolean;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function ConfigForm({ defaultValues, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTestConfigInput>({
    resolver: zodResolver(CreateTestConfigSchema),
    defaultValues: {
      name: '',
      endpoints: [{ method: 'GET', url: '', weight: 1 }],
      concurrency: 10,
      totalRequests: 100,
      timeout: 5000,
      retries: 0,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'endpoints' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Test Name *</Label>
            <Input id="name" {...register('name')} placeholder="My API Load Test" className="mt-1" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Optional description..." className="mt-1" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Endpoints</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ method: 'GET', url: '', weight: 1 })}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start">
              <Select
                defaultValue={field.method}
                onValueChange={(v) => setValue(`endpoints.${idx}.method`, v as CreateTestConfigInput['endpoints'][0]['method'])}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <Input
                  {...register(`endpoints.${idx}.url`)}
                  placeholder="https://api.example.com/endpoint"
                />
                {errors.endpoints?.[idx]?.url && (
                  <p className="mt-1 text-xs text-destructive">{errors.endpoints[idx]?.url?.message}</p>
                )}
              </div>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Load Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { name: 'concurrency' as const, label: 'Concurrency', min: 1, max: 500 },
              { name: 'totalRequests' as const, label: 'Total Requests', min: 1, max: 1000000 },
              { name: 'timeout' as const, label: 'Timeout (ms)', min: 100, max: 30000 },
              { name: 'retries' as const, label: 'Retries', min: 0, max: 5 },
            ].map(({ name, label, min, max }) => (
              <div key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  type="number"
                  min={min}
                  max={max}
                  {...register(name, { valueAsNumber: true })}
                  className="mt-1"
                />
                {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? 'Saving...' : 'Save Configuration'}
      </Button>
    </form>
  );
}
