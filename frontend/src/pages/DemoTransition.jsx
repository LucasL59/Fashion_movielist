import { useState } from 'react'
import { Link } from 'react-router-dom'
import BrandTransition from '../components/BrandTransition'
import { ArrowLeft, Play } from 'lucide-react'

export default function DemoTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleDemoStart = () => {
    setIsTransitioning(true)
    // 模擬 3 秒後的載入完成
    setTimeout(() => {
      setIsTransitioning(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <BrandTransition isVisible={isTransitioning} />
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">轉場動畫 Demo</h1>
          <p className="text-gray-500">預覽整合品牌 Logo 的登入轉場效果</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleDemoStart}
            disabled={isTransitioning}
            className="w-full btn btn-primary h-14 text-lg shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            播放轉場動畫 (3秒)
          </button>

          <p className="text-xs text-center text-gray-400">
            點擊後將全螢幕覆蓋，顯示 Logo 與 Tips
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <Link 
            to="/login" 
            className="flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回登入頁面
          </Link>
        </div>
      </div>
    </div>
  )
}
