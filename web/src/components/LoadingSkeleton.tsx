export function LoadingSkeleton({ height = '120px', width = '100%' }: { height?: string; width?: string }) {
  return <div className="skeleton" style={{ height, width }} />;
}
