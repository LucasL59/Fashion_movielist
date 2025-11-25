import { Film } from 'lucide-react'

/**
 * 通用的月份差異區塊
 */
export default function SelectionDiffSection({
  title,
  highlightColor = 'green',
  videos = [],
  emptyText = '無對應影片'
}) {
  const colorStyles = highlightColor === 'green'
    ? { wrapper: 'border-green-100 bg-green-50', title: 'text-green-700' }
    : { wrapper: 'border-red-100 bg-red-50', title: 'text-red-700' }

  return (
    <div className={`rounded-2xl border ${colorStyles.wrapper} p-4`}>
      <h4 className={`mb-4 text-base font-semibold ${colorStyles.title}`}>{title}</h4>
      {videos && videos.length > 0 ? (
        <div className="space-y-3">
          {videos.map(video => (
            <div key={video.id || video.title} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{video.title}</p>
                {video.title_en && (
                  <p className="text-xs text-gray-500 line-clamp-1">{video.title_en}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">{emptyText}</p>
      )}
    </div>
  )
}
