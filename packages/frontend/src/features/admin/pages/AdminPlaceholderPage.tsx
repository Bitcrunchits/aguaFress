import EmptyState from '../../../shared/components/EmptyState';

interface AdminPlaceholderPageProps {
  title: string;
}

export default function AdminPlaceholderPage({ title }: AdminPlaceholderPageProps) {
  return <EmptyState message={`${title} se implementará en una próxima slice`} />;
}
