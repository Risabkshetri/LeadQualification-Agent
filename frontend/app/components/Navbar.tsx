export default function Navbar() {
  return (
    <nav className="h-[60px] border-b border-[#E5E5E5] bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="h-full px-[24px] max-w-[1400px] mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[18px] text-[#111111] tracking-tight">LeadIQ</span>
          <span className="w-2 h-2 bg-[#FF6600] rounded-full"></span>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="/dashboard" 
            className="px-4 py-2 text-[13px] font-medium text-[#4B4B4B] hover:text-[#111111] hover:bg-gray-100 rounded-md transition-all duration-200"
          >
            Dashboard
          </a>
          <a 
            href="/form" 
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#111111] hover:bg-[#2A2A2A] hover:shadow-md rounded-md transition-all duration-200 flex items-center gap-2"
          >
            Submit Form
          </a>
        </div>
      </div>
    </nav>
  )
}
