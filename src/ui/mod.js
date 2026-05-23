/**
 * Clases Tailwind compartidas para los módulos (ex-modulos.css).
 * Son cadenas de utilidades reutilizables — NO es CSS, solo constantes JS.
 * Las variantes descendientes [&_input]:… replican el estilo que modulos.css
 * aplicaba por selector, para no tener que clasear cada elemento hijo.
 */

export const MODULE_CONTAINER = 'animate-fade-up p-2.5';

export const MODULE_HEADER =
    'mb-7 flex items-start justify-between max-md:flex-col max-md:gap-4 ' +
    '[&_.title-section_h1]:font-display [&_.title-section_h1]:text-[28px] [&_.title-section_h1]:text-text ' +
    '[&_.title-section_p]:mt-1 [&_.title-section_p]:text-sm [&_.title-section_p]:text-muted';

export const HEADER_ACTIONS = 'flex gap-2.5 max-md:w-full';

export const BTN_MOD =
    'flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-surface px-[18px] py-2.5 text-[13px] font-semibold text-text transition hover:-translate-y-0.5 hover:border-accent hover:text-accent disabled:opacity-60 max-md:w-full max-md:justify-center';

export const BTN_MOD_PRIMARY =
    'flex cursor-pointer items-center gap-2 rounded-[10px] border border-accent bg-accent px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(0,119,204,0.2)] transition hover:bg-[#0066b3] disabled:opacity-60';

export const BTN_MOD_DANGER =
    'flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#fecaca] bg-surface px-[18px] py-2.5 text-[13px] font-semibold text-[#ef4444] transition hover:bg-[#fef2f2]';

/* ── Stats ── */
export const STATS = 'mb-7 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 max-[480px]:grid-cols-1';
export const STAT_CARD =
    'flex items-center gap-3.5 rounded-[14px] border border-border bg-surface px-[22px] py-5 transition hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]';
export const STAT_ICON = {
    blue: 'bg-[#eff6ff] text-[#3b82f6]',
    green: 'bg-[#f0fdf4] text-[#22c55e]',
    amber: 'bg-[#fffbeb] text-[#f59e0b]',
    red: 'bg-[#fef2f2] text-[#ef4444]',
    purple: 'bg-[#faf5ff] text-[#a855f7]',
    cyan: 'bg-[#ecfeff] text-[#06b6d4]',
};
export const STAT_ICON_BASE = 'flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl text-xl';
export const STAT_VAL = 'font-display text-2xl leading-none text-text';
export const STAT_LBL = 'mt-1 text-xs font-medium text-muted';

/* ── Controls ── */
export const CONTROLS = 'mb-5 flex flex-wrap items-center gap-3';
export const SEARCH_BOX = 'relative min-w-[240px] flex-1';
export const SEARCH_ICON = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-muted';
export const SEARCH_INPUT =
    'w-full rounded-[10px] border border-border bg-surface py-2.5 pl-10 pr-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/[0.08]';
export const FILTER_SELECT =
    'min-w-[130px] cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-accent';

/* ── Table ── */
export const TABLE_WRAP = 'mb-5 overflow-hidden rounded-[14px] border border-border bg-surface max-md:overflow-x-auto';
export const TABLE =
    'w-full border-collapse text-sm ' +
    '[&_th]:border-b [&_th]:border-border [&_th]:bg-[#f8fafc] [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted ' +
    '[&_td]:border-b [&_td]:border-[#f1f5f9] [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-text ' +
    '[&_tbody_tr:hover]:bg-[#f8fafc] [&_tbody_tr:last-child_td]:border-b-0';

/* ── Badges ── */
export const BADGE = 'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold';
export const BADGE_VARIANT = {
    active: 'bg-[#dcfce7] text-[#166534]',
    inactive: 'bg-[#f1f5f9] text-[#475569]',
    pendiente: 'bg-[#fef3c7] text-[#92400e]',
    en_camino: 'bg-[#dbeafe] text-[#1e40af]',
    completada: 'bg-[#dcfce7] text-[#166534]',
    cancelada: 'bg-[#fee2e2] text-[#991b1b]',
};

/* ── Cell / avatar ── */
export const CELL_INFO = 'flex items-center gap-3 [&_.cell-text_p]:m-0 [&_.cell-sub]:text-xs [&_.cell-sub]:text-muted';
export const AVATAR_BASE = 'flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white';
export const AVATAR_COLOR = {
    blue: 'bg-[#3b82f6]',
    green: 'bg-[#22c55e]',
    purple: 'bg-[#a855f7]',
    amber: 'bg-[#f59e0b]',
    cyan: 'bg-[#06b6d4]',
};

/* ── Actions ── */
export const ACTIONS = 'flex gap-1.5';
export const ACTION_BTN =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted transition hover:border-accent hover:text-accent';
export const ACTION_BTN_DEL = 'hover:!border-[#ef4444] hover:!text-[#ef4444]';

/* ── Empty state ── */
export const EMPTY =
    'px-5 py-[60px] text-center text-muted ' +
    '[&>svg]:mx-auto [&>svg]:mb-3 [&>svg]:text-[44px] [&>svg]:opacity-30 ' +
    '[&_h3]:mb-1.5 [&_h3]:text-[17px] [&_h3]:text-text [&_p]:text-sm';

/* ── Pagination ── */
export const PAGINATION = 'flex items-center justify-between border-t border-border px-4 py-3 text-[13px] text-muted';
export const PAGE_BTNS = 'flex gap-1.5';
export const PAGE_BTN =
    'rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent';

/* ── Modal ── */
export const MODAL_OVERLAY =
    'fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px] animate-fade-up';
export const MODAL = 'max-h-[85vh] w-[520px] max-w-[92vw] overflow-y-auto rounded-[18px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]';
export const MODAL_WIDE = 'w-[600px]';
export const MODAL_HEADER =
    'flex items-center justify-between border-b border-[#f1f5f9] px-[26px] pb-3.5 pt-[22px] [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-text';
export const MODAL_CLOSE =
    'flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border bg-surface text-base text-muted transition hover:border-[#ef4444] hover:text-[#ef4444]';
export const MODAL_BODY = 'px-[26px] pb-[26px] pt-5';
export const MODAL_FOOTER = 'mt-5 flex justify-end gap-2.5';

/* ── Form ── */
export const FORM_GROUP =
    'mb-4 ' +
    '[&>label]:mb-1.5 [&>label]:block [&>label]:text-xs [&>label]:font-semibold [&>label]:uppercase [&>label]:tracking-wide [&>label]:text-muted ' +
    '[&_input]:box-border [&_input]:w-full [&_input]:rounded-[10px] [&_input]:border [&_input]:border-border [&_input]:bg-white [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-sm [&_input]:outline-none [&_input:focus]:border-accent ' +
    '[&_select]:box-border [&_select]:w-full [&_select]:rounded-[10px] [&_select]:border [&_select]:border-border [&_select]:bg-white [&_select]:px-3.5 [&_select]:py-2.5 [&_select]:text-sm [&_select]:outline-none [&_select:focus]:border-accent ' +
    '[&_textarea]:box-border [&_textarea]:w-full [&_textarea]:rounded-[10px] [&_textarea]:border [&_textarea]:border-border [&_textarea]:bg-white [&_textarea]:px-3.5 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea:focus]:border-accent';
export const FORM_ROW = 'grid grid-cols-2 gap-3.5 max-md:grid-cols-1';
export const FORM_HINT = 'mt-1 text-xs text-[#94a3b8]';
export const FORM_CHECK = 'mt-1 flex cursor-pointer items-center gap-2 text-sm font-medium text-text [&_input]:w-auto [&_input]:accent-[var(--accent)]';

/* ── Panel de configuración / inputs con icono ── */
export const PANEL_FORM = 'max-w-[560px]';
export const PREVIEW_BOX = 'mb-4 rounded-xl border border-border bg-[#f8fafc] px-4 py-3.5 text-sm';
export const INPUT_ICON = 'relative [&_input]:!pr-[42px]';
export const BTN_SHOW_PASS = 'absolute right-2.5 top-1/2 flex -translate-y-1/2 cursor-pointer border-none bg-transparent p-1 text-muted';
