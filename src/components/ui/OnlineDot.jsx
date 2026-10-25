/** Point vert « connecté », avec un léger halo animé. */
export default function OnlineDot({ label = 'Connecté' }) {
  return (
    <span aria-label={label} className="relative inline-flex h-2.5 w-2.5 shrink-0" role="img" title={label}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  )
}
