'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTestConfigSchema, type CreateTestConfigInput } from '@api-perf/shared';
import { Icon } from '@/components/ui/Icon';

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
    <form onSubmit={handleSubmit(onSubmit)} className="stack-lg">
      <div className="card">
        <div className="card__head"><div className="card__title">Basic Info</div></div>
        <div className="card__body stack">
          <div>
            <label className="label">Test Name *</label>
            <input className="input" {...register('name')} placeholder="My API Load Test" />
            {errors.name && <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--err)' }}>{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="textarea" {...register('description')} placeholder="Optional description…" rows={2} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Endpoints</div>
          <button type="button" className="btn btn--sm" onClick={() => append({ method: 'GET', url: '', weight: 1 })}>
            <Icon name="plus" size={12} />
            Add
          </button>
        </div>
        <div className="card__body stack-sm">
          {fields.map((field, idx) => (
            <div key={field.id} className="field-row" style={{ alignItems: 'flex-start' }}>
              <select
                className="select"
                style={{ width: 100, flexShrink: 0 }}
                {...register(`endpoints.${idx}.method`)}
              >
                {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{ flex: 1 }}>
                <input
                  className="input"
                  {...register(`endpoints.${idx}.url`)}
                  placeholder="https://api.example.com/endpoint"
                />
                {errors.endpoints?.[idx]?.url && (
                  <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--err)' }}>
                    {errors.endpoints[idx]?.url?.message}
                  </p>
                )}
              </div>
              {fields.length > 1 && (
                <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(idx)}>
                  <Icon name="trash" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card__head"><div className="card__title">Load Settings</div></div>
        <div className="card__body">
          <div className="grid-4">
            {([
              { name: 'concurrency'    as const, label: 'Concurrency',      min: 1,   max: 500     },
              { name: 'totalRequests'  as const, label: 'Total Requests',   min: 1,   max: 1000000 },
              { name: 'timeout'        as const, label: 'Timeout (ms)',     min: 100, max: 30000   },
              { name: 'retries'        as const, label: 'Retries',          min: 0,   max: 5       },
            ] as const).map(({ name, label, min, max }) => (
              <div key={name}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  type="number"
                  min={min}
                  max={max}
                  {...register(name, { valueAsNumber: true })}
                />
                {errors[name] && (
                  <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--err)' }}>{errors[name]?.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn--primary btn--lg" disabled={isLoading}>
        {isLoading ? <><span className="spinner" /> Saving…</> : 'Save Configuration'}
      </button>
    </form>
  );
}
