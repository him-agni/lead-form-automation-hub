import { useRetryEvent } from '../hooks/useSubmissions';

const STATUS_COLORS = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  partial_failure: 'bg-yellow-500',
  processing: 'bg-blue-400 animate-pulse',
  pending: 'bg-gray-500',
};

const STATUS_LABELS = {
  success: 'Success',
  failed: 'Failed',
  partial_failure: 'Partial',
  processing: 'Processing',
  pending: 'Pending',
};

const DEST_ICONS = {
  airtable: '🟡',
  discord: '🟣',
  sheets: '🟢',
};

function maskFieldValue(key, value) {
  const label = key.toLowerCase();
  const text = String(value ?? '—');

  if (label.includes('email')) {
    const [name, domain] = text.split('@');
    if (!domain) return '••••';
    return `${name.slice(0, 2)}•••@${domain}`;
  }

  if (label.includes('phone') || label.includes('mobile')) {
    return text.replace(/\d(?=\d{2})/g, '•');
  }

  if (label.includes('message') || label.includes('notes')) {
    return text.length > 24 ? `${text.slice(0, 24)}...` : text;
  }

  return text;
}

export default function SubmissionCard({ submission }) {
  const { mutate: retry, isPending, isError, error } = useRetryEvent();
  const fields = submission.fields ? Object.entries(submission.fields) : [];
  const hasFailed = submission.destinations?.some(d => d.status === 'failed');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 font-mono">{submission.tallySubmissionId}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {new Date(submission.createdAt).toLocaleString()}
            {submission.simulatedAt && (
              <span className="ml-2 text-brand bg-brand/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                SIMULATED
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-2 h-2 rounded-full inline-block ${STATUS_COLORS[submission.overallStatus]}`}
          />
          <span className="text-xs text-gray-400">{STATUS_LABELS[submission.overallStatus]}</span>
        </div>
      </div>

      {/* Field values */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {fields.slice(0, 6).map(([k, v]) => (
            <div key={k} className="text-xs">
              <span className="text-gray-500">{k}: </span>
              <span className="text-gray-200 truncate">{maskFieldValue(k, v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Per-destination status pills */}
      {submission.destinations?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {submission.destinations.map(d => (
            <div
              key={d.destination}
              className="flex items-center gap-1 text-xs bg-gray-800 rounded-full px-2 py-1"
              title={d.error || ''}
            >
              <span>{DEST_ICONS[d.destination] || '⬜'}</span>
              <span className="capitalize text-gray-300">{d.destination}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  d.status === 'success' ? 'bg-green-400' : d.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`}
              />
              {d.attempts > 1 && (
                <span className="text-gray-500 text-[10px]">{d.attempts}x</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Retry button — only shown when at least one destination failed */}
      {hasFailed && (
        <button
          onClick={() => retry(submission._id)}
          disabled={isPending}
          className="mt-1 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800 text-red-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Retrying...' : 'Retry Failed Destinations'}
        </button>
      )}
      {isError && (
        <p className="text-xs text-red-300">
          {error?.response?.data?.error || error?.message || 'Retry failed'}
        </p>
      )}
    </div>
  );
}
