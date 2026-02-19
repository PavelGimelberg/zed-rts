interface Props {
  children: React.ReactNode;
}

export function HUDPanel({ children }: Props) {
  return <div className="hud-panel">{children}</div>;
}
