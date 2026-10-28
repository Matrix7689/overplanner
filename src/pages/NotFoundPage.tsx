import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm text-stone-500">Nothing here.</p>
      <Link to="/" className="mt-2 inline-block text-sm underline hover:text-stone-600">
        Back to Dashboard
      </Link>
    </div>
  );
}
