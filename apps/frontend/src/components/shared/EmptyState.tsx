import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {description && <p className="empty__sub">{description}</p>}
      {action}
    </div>
  );
}
