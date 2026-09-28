import Image from "next/image";

const LOCATIONS = [
  { name: "Sun Valley", href: "https://sunvalleyidaho.gov/" },
  { name: "Park City", href: "https://www.parkcity.gov/" },
  { name: "Jackson Hole", href: "https://www.jacksonwy.gov/" },
  { name: "Chelan", href: "https://www.cityofchelan.gov/" },
] as const;

export function SiteBanner() {
  return (
    <div className="bg-background">
      <p className="px-4 py-4 text-center text-xs uppercase tracking-[0.22em] text-steel sm:px-6 sm:py-5">
        {LOCATIONS.map((location, index) => (
          <span key={location.name}>
            {index > 0 ? <span aria-hidden="true"> · </span> : null}
            <a
              href={location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-foreground"
            >
              {location.name}
            </a>
          </span>
        ))}
      </p>

      <div className="banner-reveal relative mx-auto aspect-[3.2/1] w-full max-w-7xl overflow-hidden bg-surface sm:aspect-[3.8/1]">
        <Image
          src="/images/ontic-banner.png"
          alt="DJ Ontic"
          fill
          priority
          draggable={false}
          className="scale-[1.04] object-cover object-center outline-none select-none"
          sizes="100vw"
        />
      </div>
    </div>
  );
}
