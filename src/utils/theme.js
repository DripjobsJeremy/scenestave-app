/**
 * Theme utility — reads CSS custom properties for use in inline styles.
 * Use these when Tailwind classes can't reference CSS variables directly
 * (e.g. dynamic style props, programmatically generated elements).
 *
 * CSS variables are set by organizationService.applyBrandingToDOM() on app
 * mount and whenever the org's branding is updated in Settings.
 */
const themeStyles = {
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-primary-text, #FFFFFF)',
  },
  btnPrimaryHover: {
    backgroundColor: 'var(--color-primary-dark)',
  },
  bgSurface: {
    backgroundColor: 'var(--color-bg-surface)',
  },
  bgElevated: {
    backgroundColor: 'var(--color-bg-elevated)',
  },
  bgBase: {
    backgroundColor: 'var(--color-bg-base)',
  },
  textPrimary: {
    color: 'var(--color-text-primary)',
  },
  textSecondary: {
    color: 'var(--color-text-secondary)',
  },
  textBrand: {
    color: 'var(--color-primary)',
  },
  borderTheme: {
    borderColor: 'var(--color-border)',
  },
  cardStyle: {
    backgroundColor: 'var(--color-bg-surface)',
    borderColor: 'var(--color-border)',
  },
};

// Inline style helpers — call these where a single property is needed
const primaryBg     = () => ({ backgroundColor: 'var(--color-primary)' });
const primaryText   = () => ({ color: 'var(--color-primary)' });
const primaryBorder = () => ({ borderColor: 'var(--color-primary)' });
const accentText    = () => ({ color: 'var(--color-accent)' });
const surfaceBg     = () => ({ backgroundColor: 'var(--color-bg-surface)' });
const baseBg        = () => ({ backgroundColor: 'var(--color-bg-base)' });

window.themeStyles    = themeStyles;
window.primaryBg      = primaryBg;
window.primaryText    = primaryText;
window.primaryBorder  = primaryBorder;
window.accentText     = accentText;
window.surfaceBg      = surfaceBg;
window.baseBg         = baseBg;
