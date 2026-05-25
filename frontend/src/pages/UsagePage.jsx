import {
  Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { SafeSection } from '../components/ErrorBoundary'
import QueryError from '../components/QueryError'
import { useUsage } from '../hooks/useApplications'

const AGENT_LABELS = {
  fit_agent:          'Fit scoring',
  writer_agent_cv:    'CV tailoring',
  writer_agent_cl:    'Cover letter',
  tone_agent:         'Tone analysis',
  research_agent:     'Company research',
  interview_agent:    'Interview prep',
  cv_structure_agent: 'CV structuring',
}

function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function UsagePage() {
  const { data, isLoading, isError, error, refetch } = useUsage()

  if (isLoading) return <UsageSkeleton />
  if (isError) return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <QueryError error={error} onRetry={refetch} />
    </div>
  )

  const { all_time, this_month, agent_breakdown, daily_activity, pricing_note } = data

  const costPerApp = all_time.total_applications > 0
    ? (all_time.actual_cost_usd / all_time.total_applications).toFixed(4)
    : '0.0000'

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Usage &amp; cost</h1>
        <p className="text-sm text-gray-500 mt-1">API usage and cost savings from prompt caching</p>
      </div>

      {/* Backfill notice */}
      {all_time.total_api_calls === 0 && all_time.total_applications > 0 && (
        <div className="flex items-start gap-3 p-4 bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl">
          <span className="text-gray-500 flex-shrink-0 text-base">ℹ</span>
          <p className="text-sm text-gray-400">
            Usage tracking was added after your existing applications were generated.
            New applications will be tracked from now on.
          </p>
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Applications generated"
          value={all_time.total_applications.toLocaleString()}
          sub={`${this_month.applications} this month`}
          icon="🚀"
        />
        <StatCard
          label="API calls made"
          value={all_time.total_api_calls.toLocaleString()}
          sub={`${this_month.api_calls} this month`}
          icon="⚡"
        />
        <StatCard
          label="Tokens used"
          value={formatTokens(all_time.total_tokens)}
          sub={`${formatTokens(all_time.cache_read_tokens)} served from cache`}
          icon="🔢"
        />
        <StatCard
          label="Estimated spend"
          value={`$${all_time.actual_cost_usd}`}
          sub={`$${costPerApp} per application`}
          icon="💰"
        />
      </div>

      {/* Prompt caching savings */}
      <SafeSection>
        <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">Prompt caching savings</h2>
              <p className="text-sm text-gray-500">
                System prompts and CV text are cached across agent calls, reducing API costs significantly.
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#fd5a04]">{all_time.savings_pct}%</p>
              <p className="text-sm text-gray-500">cost reduction</p>
            </div>
          </div>

          {/* Cost comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <CostCard label="Without caching" amount={all_time.full_cost_usd}   muted />
            <CostCard label="With caching"    amount={all_time.actual_cost_usd} />
            <CostCard label="Total saved"     amount={all_time.savings_usd}     highlight />
          </div>

          {/* Cache efficiency bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Cache efficiency</span>
              <span>{all_time.cache_hit_rate}% of input tokens served from cache</span>
            </div>
            <div className="h-2 bg-[#2a2826] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fd5a04] rounded-full transition-all"
                style={{ width: `${Math.min(all_time.cache_hit_rate, 100)}%` }}
              />
            </div>
          </div>

          {/* Token breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Input tokens',  value: formatTokens(all_time.total_input_tokens),    color: 'text-gray-300' },
              { label: 'Output tokens', value: formatTokens(all_time.total_output_tokens),   color: 'text-gray-300' },
              { label: 'Cache writes',  value: formatTokens(all_time.cache_creation_tokens), color: 'text-yellow-400' },
              { label: 'Cache reads',   value: formatTokens(all_time.cache_read_tokens),     color: 'text-[#fd5a04]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#232220] rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </SafeSection>

      {/* Daily activity chart */}
      <SafeSection>
        <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-5">API calls — last 30 days</h2>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[400px] h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={daily_activity}
                  margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2c2a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b6866', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={d => d.slice(8)}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: '#6b6866', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#232220',
                      border: '1px solid #2e2c2a',
                      borderRadius: '8px',
                      color: '#DAE3E5',
                      fontSize: '12px',
                    }}
                    labelFormatter={d => `Date: ${d}`}
                    formatter={v => [`${v} calls`, 'API calls']}
                  />
                  <Bar dataKey="calls" fill="#fd5a04" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SafeSection>

      {/* Agent breakdown */}
      <SafeSection>
        <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Calls by agent</h2>
          {agent_breakdown.length === 0 ? (
            <p className="text-sm text-gray-500">
              No API calls logged yet. Generate an application to see usage data.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {agent_breakdown.map(agent => {
                const maxCalls = Math.max(...agent_breakdown.map(a => a.calls))
                const pct = Math.round(agent.calls / maxCalls * 100)
                return (
                  <div key={agent.agent}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300">{AGENT_LABELS[agent.agent] || agent.agent}</span>
                      <span className="text-gray-500">
                        {agent.calls.toLocaleString()} calls · {formatTokens(agent.input_tokens + agent.output_tokens)} tokens
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2a2826] rounded-full">
                      <div className="h-full bg-[#fd5a04] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SafeSection>

      {/* This month */}
      <SafeSection>
        <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">This month</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Applications',      value: this_month.applications.toLocaleString() },
              { label: 'API calls',         value: this_month.api_calls.toLocaleString() },
              { label: 'Estimated cost',    value: `$${this_month.actual_cost_usd}` },
              { label: 'Saved vs no cache', value: `$${this_month.savings_usd}`, accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label} className="bg-[#232220] rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-semibold ${accent ? 'text-[#fd5a04]' : 'text-white'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </SafeSection>

      <p className="text-xs text-gray-600 text-center pb-4">{pricing_note}</p>
    </div>
  )
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

function CostCard({ label, amount, muted, highlight }) {
  return (
    <div className={`rounded-lg p-3 ${
      highlight ? 'bg-[#fd5a04]/10 border border-[#fd5a04]/20' : 'bg-[#232220]'
    }`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${
        highlight ? 'text-[#fd5a04]' : muted ? 'text-gray-400' : 'text-white'
      }`}>
        ${amount}
      </p>
    </div>
  )
}

function UsageSkeleton() {
  function Pulse({ className }) {
    return <div className={`animate-pulse bg-[#2a2826] rounded-lg ${className}`} />
  }
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <Pulse className="h-7 w-40 mb-2" />
        <Pulse className="h-4 w-56 mb-0" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-4">
            <Pulse className="h-3 w-24 mb-3" />
            <Pulse className="h-7 w-16 mb-1" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-6 h-52">
        <Pulse className="h-5 w-48 mb-4" />
        <Pulse className="h-32 w-full" />
      </div>
    </div>
  )
}
