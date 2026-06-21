import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 shrink-0">
      <Link
        href="/"
        className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
      >
        📅 Calendar
      </Link>
      <Link
        href="/manage"
        className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
      >
        ✏️ Manage Meals
      </Link>
    </nav>
  );
}
