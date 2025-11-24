import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '請選擇',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleGlobalClick = (event) => {
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return
      }
      if (event.target.closest('.select-dropdown-portal')) {
        return
      }
      setIsOpen(false)
    }

    const handleScroll = (event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return
      }
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return
      }
      setIsOpen(false)
    }
    const handleResize = () => setIsOpen(false)

    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const toggleOpen = () => {
    if (disabled) return
    
    if (!isOpen) {
      // Calculate position before opening
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        })
      }
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } })
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`
          relative w-full bg-white border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-200 flex items-center text-sm font-medium
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300'}
          ${isOpen ? 'ring-2 ring-primary-500/20 border-primary-500' : ''}
        `}
      >
        <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
          {selectedOption ? selectedOption.label || selectedOption.value : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="select-dropdown-portal absolute z-[9999] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl max-h-60 overflow-y-auto border border-gray-100 focus:outline-none pr-1 custom-scrollbar"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
          <style>{`
            .select-dropdown-portal::-webkit-scrollbar {
              width: 6px;
            }
            .select-dropdown-portal::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.7);
              border-radius: 999px;
            }
            .select-dropdown-portal::-webkit-scrollbar-thumb:hover {
              background-color: rgba(107, 114, 128, 0.9);
            }
          `}</style>
          <div className="py-1">
            {options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">無選項</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 transition-colors text-sm
                    ${option.value === value ? 'text-primary-600 bg-primary-50/50 font-medium' : 'text-gray-700'}
                  `}
                >
                  <span className="block truncate">
                    {option.label || option.value}
                  </span>
                  {option.value === value && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
