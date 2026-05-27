interface MethodProps {
  children: string;
}

export function Method({ children }: MethodProps) {
  return (
    <span className={'method method--' + children}>{children}</span>
  );
}
