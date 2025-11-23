import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from 'lucide-react'

// 預設的 Tips 清單，之後可以從外部傳入或擴充
const DEFAULT_TIPS = [
  "登入後，您可以查看最新的時尚影片清單",
  "支援多裝置瀏覽，隨時隨地掌握流行資訊",
  "定期更新內容，讓您不錯過任何精彩片段",
  "您可以將喜歡的影片加入收藏，方便日後觀看",
  "如有播放問題，請檢查網路連線或聯絡管理員"
]

export default function BrandTransition({ 
  isVisible, 
  logoSrc = "/fashion-logo.png", 
  tips = DEFAULT_TIPS,
  minDisplayTime = 2000 
}) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [show, setShow] = useState(false)
  const [opacity, setOpacity] = useState(0)

  // 處理顯示/隱藏的轉場邏輯
  useEffect(() => {
    let fadeTimer
    if (isVisible) {
      setShow(true)
      // 稍微延遲一下讓 DOM 渲染後再開始淡入，確保 transition 生效
      requestAnimationFrame(() => setOpacity(1))
    } else {
      setOpacity(0)
      // 等待淡出動畫結束後再從 DOM 移除
      fadeTimer = setTimeout(() => setShow(false), 500)
    }
    return () => clearTimeout(fadeTimer)
  }, [isVisible])

  // Tips 輪播邏輯
  useEffect(() => {
    if (!isVisible) return
    
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length)
    }, 2500) // 每 2.5 秒換一句 Tip

    return () => clearInterval(interval)
  }, [isVisible, tips.length])

  if (!show) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out"
      style={{ opacity: opacity }}
    >
      {/* 背景裝飾 - 與登入頁一致的風格但更淡 */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-100/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-100/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        {/* Logo 容器 - 加入呼吸燈動畫 */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl animate-pulse opacity-50"></div>
          <img 
            src={logoSrc} 
            alt="Brand Logo" 
            className="w-32 h-32 object-contain relative z-10 animate-float drop-shadow-xl"
          />
        </div>

        {/* Loading 指示器 */}
        <div className="mb-8">
          <div className="h-1.5 w-48 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 animate-progress-bar rounded-full"></div>
          </div>
        </div>

        {/* Tips 區域 */}
        <div className="h-16 flex items-center justify-center w-full">
          <p className="text-gray-500 text-center font-medium animate-fade-in-up key-change">
            <span className="text-primary-500 mr-2 text-xs font-bold uppercase tracking-wider border border-primary-200 px-2 py-0.5 rounded-full bg-primary-50">Tip</span>
            {tips[currentTipIndex]}
          </p>
        </div>
      </div>
        
      <div className="absolute bottom-12 text-xs text-gray-400 tracking-widest uppercase">
        Loading Experience
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes progress-bar {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; }
          100% { width: 100%; transform: translateX(100%); }
        }
        .animate-progress-bar {
          animation: progress-bar 1.5s infinite linear;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        /* 讓文字切換時有重新觸發動畫的感覺 */
        .key-change {
          key: ${currentTipIndex};
        }
      `}</style>
    </div>,
    document.body
  )
}
