import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm text-caption">Nothing here.</p>
      <Link to="/" className="mt-2 inline-block text-sm underline hover:text-body">
        Back to Dashboard
      </Link>
    </div>
  );
}
