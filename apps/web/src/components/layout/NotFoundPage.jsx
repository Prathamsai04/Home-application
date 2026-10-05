import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../ui';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      className="py-24"
      action={
        <Link to="/" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Back to dashboard
        </Link>
      }
    />
  );
}
