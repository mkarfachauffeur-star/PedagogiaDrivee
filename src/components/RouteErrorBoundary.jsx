import { Component } from 'react'
import PageShell from './ui/PageShell'
import EmptyState from './ui/EmptyState'

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary]', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <PageShell>
        <EmptyState
          icon="💥"
          title="Erreur d'affichage"
          message={error?.message || 'Une erreur inattendue est survenue.'}
          className="border-rose-200 bg-rose-50/80"
        />
        <pre className="overflow-x-auto rounded-2xl border border-slate-300 bg-slate-950 p-4 text-xs text-emerald-300">
          {String(error?.stack || error)}
        </pre>
      </PageShell>
    )
  }
}
