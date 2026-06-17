import { useState } from 'react';
import { useSimulate } from '../hooks/useSubmissions';

const defaults = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  company: 'Acme Corp',
  message: 'Interested in a demo.',
};

export default function SimulateForm() {
  const [form, setForm] = useState(defaults);
  const [sent, setSent] = useState(false);
  const { mutate: simulate, isPending, isError, error } = useSimulate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    simulate(form, {
      onSuccess: () => {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      },
    });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Simulate Submission
      </h2>
      <p className="text-xs text-gray-500">
        Fires a synthetic Tally event through the full pipeline — Airtable, Discord, and Sheets.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'company', label: 'Company', type: 'text' },
        ].map(({ name, label, type }) => (
          <div key={name}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            <input
              type={type}
              name={name}
              value={form[name]}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Message</label>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-brand hover:bg-brand/80 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Sending...' : sent ? 'Sent! Check the feed' : 'Fire Test Submission'}
        </button>
        {isError && (
          <p className="text-xs text-red-300">
            {error?.response?.data?.error || error?.message || 'Failed to send test submission'}
          </p>
        )}
      </form>
    </div>
  );
}
