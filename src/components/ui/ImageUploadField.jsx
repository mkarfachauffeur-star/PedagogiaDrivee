const fileInputClass =
  'mt-2 min-h-12 w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-[#1769FF] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60'

export default function ImageUploadField({
  label,
  hint,
  file,
  previewUrl,
  onChange,
  disabled = false,
  accept = 'image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic',
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="mt-0.5 block text-xs font-medium text-slate-500">{hint}</span>}
      {previewUrl && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-300 bg-slate-50">
          <img alt={label} className="mx-auto max-h-36 w-full object-contain p-2" src={previewUrl} />
        </div>
      )}
      <input
        accept={accept}
        className={fileInputClass}
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        type="file"
      />
      {file && (
        <span className="mt-2 block truncate text-xs font-semibold text-blue-700">
          Fichier sélectionné : {file.name}
        </span>
      )}
    </label>
  )
}
