export default function RetroColorBars({ height = 'h-3' }: { height?: string }) {
  return (
    <div className={`flex w-full ${height} overflow-hidden`} aria-hidden="true">
      <div className="flex-1 bg-[#F5C518]" />
      <div className="flex-1 bg-[#F59B18]" />
      <div className="flex-1 bg-[#F07B18]" />
      <div className="flex-1 bg-[#E84C25]" />
      <div className="flex-1 bg-[#D42E3A]" />
      <div className="flex-1 bg-[#B8224A]" />
      <div className="flex-1 bg-[#8C2377]" />
      <div className="flex-1 bg-[#5B2A8C]" />
      <div className="flex-1 bg-[#2E3494]" />
      <div className="flex-1 bg-[#1A5FAB]" />
    </div>
  );
}
