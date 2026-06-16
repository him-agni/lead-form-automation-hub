import EventFeed from '../components/EventFeed';
import IntegrationStatus from '../components/IntegrationStatus';
import SimulateForm from '../components/SimulateForm';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Lead & Form Automation Hub</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tally → Airtable · Discord · Google Sheets
            </p>
          </div>
          <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded-full">
            Live
          </span>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed — takes 2 cols */}
          <div className="lg:col-span-2">
            <EventFeed />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <IntegrationStatus />
            <SimulateForm />
          </div>
        </div>
      </div>
    </div>
  );
}
