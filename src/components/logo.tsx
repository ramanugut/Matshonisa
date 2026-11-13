export function Logo({ className = 'h-9', light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light ? '/logo-mark-light.svg' : '/logo-mark.svg'} alt="" className={`${className} w-auto shrink-0`} />
      <span className="text-lg leading-none">Machonisa</span>
    </span>
  );
}
