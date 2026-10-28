export function renderCharterBlocks(content = '') {
  const lines = String(content || '').split('\n')
  const blocks = []
  let paragraph = []
  let listItems = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push({ type: 'paragraph', text })
    paragraph = []
  }

  const flushList = () => {
    if (listItems.length) blocks.push({ type: 'list', items: [...listItems] })
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
      continue
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      continue
    }

    if (line.startsWith('* ')) {
      flushParagraph()
      listItems.push(line.slice(2).trim())
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

export default function CharterContentView({ content, className = '' }) {
  const blocks = renderCharterBlocks(content)

  return (
    <div className={`space-y-4 text-[15px] leading-7 text-slate-700 [overflow-wrap:break-word] sm:text-sm ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'h1') {
          return (
            <h2 key={`${block.type}-${index}`} className="text-2xl font-semibold text-slate-950">
              {block.text}
            </h2>
          )
        }
        if (block.type === 'h2') {
          return (
            <h3 key={`${block.type}-${index}`} className="pt-2 text-lg font-semibold text-slate-900">
              {block.text}
            </h3>
          )
        }
        if (block.type === 'list') {
          return (
            <ul key={`${block.type}-${index}`} className="list-disc space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={`${block.type}-${index}`} className="text-slate-700">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
