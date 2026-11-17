import { Check, Droplet, MapPin, ShieldCheck, Star } from 'lucide-react';

// a still picture of the result screen, so visitors see what they will get
export function PhoneDemo() {
  return (
    <figure
      aria-label="Example: what Karigor shows after you describe a leaking kitchen tap"
      className="mx-auto w-full max-w-[300px] rounded-[2.2rem] bg-tea p-2.5 shadow-[0_24px_60px_rgba(42,33,24,0.3)]"
    >
      <div className="grid gap-2.5 overflow-hidden rounded-[1.7rem] bg-paper px-3 pb-4 pt-3 text-[13px] leading-snug">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-line" aria-hidden="true" />
        <p className="rounded-xl bg-white px-3 py-2 text-muted shadow-sm">
          “রান্নাঘরের কল দিয়ে পানি পড়ছে”
        </p>

        <div className="grid gap-2 rounded-xl border border-line bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-turmeric-soft">
              <Droplet size={16} aria-hidden="true" />
            </span>
            <div className="grid">
              <b className="font-heading text-base leading-none">Plumber</b>
              <span className="mt-1 flex gap-1">
                <span className="rounded-full bg-pond-soft px-1.5 text-[11px] font-bold text-pond">
                  Not urgent
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-paper px-1.5 text-[11px] font-bold text-muted">
                  <Check size={10} aria-hidden="true" />
                  We're sure
                </span>
              </span>
            </div>
          </div>
          <p className="font-semibold">Kitchen tap is leaking. Usually a worn washer.</p>
        </div>

        <div className="grid gap-0.5 rounded-xl border border-line bg-white p-3">
          <span className="text-[11px] font-semibold text-muted">Rough price</span>
          <b className="font-heading text-xl leading-tight">৳200 – ৳400</b>
          <span className="text-[11px] text-muted">Parts extra. Cash after the work.</span>
        </div>

        <div className="relative grid gap-1.5 rounded-xl border-2 border-turmeric bg-white p-3 pt-3.5">
          <span className="absolute -top-2.5 left-3 rounded-full bg-turmeric px-2 text-[11px] font-bold">
            Best match
          </span>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-pond-soft text-xs font-bold text-pond">
              RU
            </span>
            <div className="grid flex-1">
              <b>Rahim Uddin</b>
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                <MapPin size={10} aria-hidden="true" />
                1.2 km · Mirpur 10
              </span>
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-pond-soft px-1.5 text-[11px] font-bold text-pond">
              <ShieldCheck size={11} aria-hidden="true" />
              Checked
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Star
                size={12}
                className="fill-turmeric-dark text-turmeric-dark"
                aria-hidden="true"
              />
              4.8 · 18 tap repairs
            </span>
            <span className="rounded-lg bg-turmeric px-3 py-1 font-bold">Book</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
