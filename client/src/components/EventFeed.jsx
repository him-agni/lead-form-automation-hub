import { useState } from 'react';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionCard from './SubmissionCard';

export default function EventFeed() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useSubmissions(page);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Live Submission Feed
        </h2>
        {data && (
          <span className="text-xs text-gray-500">
            {data.total} total
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-28 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          Failed to load submissions. Is the server running?
        </div>
      )}

      {data?.submissions?.length === 0 && (
        <div className="text-center text-gray-600 py-16 text-sm">
          No submissions yet. Use the Simulate button to fire a test event.
        </div>
      )}

      <div className="space-y-3">
        {data?.submissions?.map(sub => (
          <SubmissionCard key={sub._id} submission={sub} />
        ))}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs px-3 py-1.5 bg-gray-800 rounded-lg text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500 self-center">
            {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="text-xs px-3 py-1.5 bg-gray-800 rounded-lg text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
