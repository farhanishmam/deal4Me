import Image from "next/image";

/**
 * The same soft, scrimmed Wasatch photo the import and describe screens use,
 * fixed behind the content. Kept local to the photos flow so it does not touch FlowChrome.
 */
export function FlowBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      <div className="absolute inset-0">
        <Image
          src="/demo/scenes/wasatch-peak.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40 saturate-[0.8]"
          style={{ objectPosition: "50% 50%" }}
        />
      </div>
      <div className="absolute inset-0 bg-background/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_52%,var(--background)_0%,transparent_100%)] opacity-80" />
      <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-background to-transparent" />
    </div>
  );
}
