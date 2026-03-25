import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-20">

      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-citi-heading mb-6 tracking-tight">
          Your money,<br />
          <span className="text-citi-action">under your control</span>
        </h1>
        <p className="text-citi-muted text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Checking, savings, and transfers — all in one place.
          No minimum balance. No surprises.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/signin"
            className="bg-citi-action text-white font-semibold px-8 py-4 rounded-sm text-lg hover:bg-citi-blue transition-all duration-150 active:scale-95"
          >
            Open an Account
          </Link>
          <Link
            to="/about"
            className="bg-citi-card border border-citi-border text-citi-heading px-8 py-4 rounded-sm text-lg hover:bg-citi-surface transition-all duration-150 active:scale-95"
          >
            Learn More
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Bank-Level Security',  desc: '256-bit encryption and two-factor authentication on every account.' },
          { title: 'Instant Transfers',    desc: 'Move money between accounts in seconds, any day of the week.' },
          { title: 'Full Transparency',    desc: 'Every fee, every transaction — visible and explained in plain language.' },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-citi-card border border-citi-border rounded-xl p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-citi-heading font-semibold text-xl mb-3">{feature.title}</h3>
            <p className="text-citi-muted leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
