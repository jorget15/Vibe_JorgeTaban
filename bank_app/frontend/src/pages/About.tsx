export default function About() {
  const stats = [
    { label: 'Assets Under Management', value: '$2.4B' },
    { label: 'Active Accounts',          value: '10,000+' },
    { label: 'Uptime',                   value: '99.9%' },
    { label: 'Customer Support',         value: '24/7' },
  ]

  return (
    <main className="max-w-4xl mx-auto px-6 py-24">
      <div className="bg-citi-card border border-citi-border rounded-xl p-12 shadow-sm">
        <span className="inline-block bg-citi-action/10 border border-citi-action/20 text-citi-action text-xs px-3 py-1 rounded-full mb-6 tracking-widest uppercase">
          Chartered Since 2025
        </span>
        <h1 className="text-4xl font-bold text-citi-heading mb-4 tracking-tight">About VaultBank</h1>
        <p className="text-citi-text text-lg leading-relaxed mb-4">
          VaultBank is a federally insured digital bank built on a simple belief: every person
          deserves a financial institution that works for them — not against them.
        </p>
        <p className="text-citi-muted leading-relaxed mb-10">
          We offer checking and savings accounts with no minimum balance requirements,
          no monthly maintenance fees, and real-time transaction visibility.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-citi-surface rounded-xl p-6 border border-citi-border text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-2xl font-bold text-citi-heading mb-2">{stat.value}</div>
              <div className="text-citi-muted text-xs leading-snug">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
