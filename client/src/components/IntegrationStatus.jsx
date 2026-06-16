import { useStats } from '../hooks/useSubmissions';

const DESTINATIONS = [
  { key: 'airtable', label: 'Airtable', icon: '🟡' },
  { key: 'discord', label: 'Discord', icon: '🟣' },
  { key: 'sheets', label: 'Google Sheets', icon: '🟢' },
];

export default function IntegrationStatus() {
  const { data: stats, isLoading } = useStats();

  // Build a { destination: { success, failed } } map from the aggregated stats
  const destMap = {};
  if (stats?.destinationStats) {
    for (const { _id, count } of stats.destinationStats) {
      if (!destMap[_id.destination]) destMap[_id.destination] = { success: 0, failed: 0 };
      destMap[_id.destination][_id.status] = count;
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Integration Health
      </h2>

      {/* Overall counts */}
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Total', value: stats?.total ?? '—', color: 'text-gray-200' },
          { label: 'Success', value: stats?.success ?? '—', color: 'text-green-400' },
          { label: 'Partial', value: stats?.partial ?? '—', color: 'text-yellow-400' },
          { label: 'Failed', value: stats?.failed ?? '—', color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-3">
            <p className={`text-xl font-bold ${color}`}>{isLoading ? '—' : value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-destination health */}
      <div className="space-y-2">
        {DESTINATIONS.map(({ key, label, icon }) => {
          const d = destMap[key] || { success: 0, failed: 0 };
          const total = d.success + d.failed;
          const pct = total === 0 ? 100 : Math.round((d.success / total) * 100);
          const healthy = pct >= 80;

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{icon}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{label}</span>
                  <span className={healthy ? 'text-green-400' : 'text-red-400'}>
                    {isLoading ? '—' : `${pct}%`}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${healthy ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: isLoading ? '0%' : `${pct}%` }}
                  />
                </div>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
