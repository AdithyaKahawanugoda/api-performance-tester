import type { ReactNode } from 'react';

interface PageHeadProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
}

export function PageHead({ title, sub, actions }: PageHeadProps) {
  return (
    <div className="pagehead">
      <div>
        <h1 className="pagehead__title">{title}</h1>
        {sub && <div className="pagehead__sub">{sub}</div>}
      </div>
      {actions && <div className="pagehead__actions">{actions}</div>}
    </div>
  );
}
