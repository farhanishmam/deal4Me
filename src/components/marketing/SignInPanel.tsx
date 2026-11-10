import { THEMES, type SignInTheme } from "./signin/themes";
import { ThemeLogo } from "./signin/ThemeMark";

/**
 * Brand side of the sign-in screen: mark and wordmark, headline, and the scene.
 * Colors come from the variables on the surrounding data-theme wrapper.
 */
export function SignInPanel({ theme }: { theme: SignInTheme }) {
  return (
    <aside className="signin-panel relative isolate flex flex-col overflow-hidden px-4 pt-5 lg:block lg:min-h-dvh lg:px-14 lg:py-12">
      <div className="relative z-10 flex shrink-0 flex-col lg:h-full">
        <ThemeLogo id={theme.id} />

        {/* key restarts the entrance animation when the theme changes */}
        <div key={theme.id} className="animate-rise mt-4 lg:mt-[15vh]">
          <h1 className="signin-headline text-[40px] leading-[1.04] font-bold tracking-[-0.03em] lg:text-display">
            {theme.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          {theme.eyebrow && (
            <div className="signin-on-muted mt-3 flex items-center gap-4 lg:mt-5">
              <span className="text-[11px] font-semibold tracking-[0.2em] whitespace-nowrap">{theme.eyebrow}</span>
              <span aria-hidden className="signin-rule" />
            </div>
          )}
          {theme.tagline && (
            <p className="signin-on-muted mt-5 hidden max-w-[34ch] text-[17px] leading-relaxed lg:block">{theme.tagline}</p>
          )}
        </div>
      </div>

      <div aria-hidden className="signin-scene">
        {THEMES.map((t) => (
          <div
            key={t.id}
            className="signin-scene-layer"
            data-active={t.id === theme.id}
            data-scene={t.id}
            style={{ backgroundImage: `url(${t.scene})` }}
          />
        ))}
      </div>
    </aside>
  );
}
