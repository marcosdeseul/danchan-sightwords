export type IconName =
  | "speaker"
  | "check"
  | "refresh"
  | "shuffle"
  | "left"
  | "right"
  | "up"
  | "down"
  | "trash"
  | "star"
  | "user"
  | "bag"
  | "shield"
  | "close";

export function IconSprite() {
  return (
    <svg aria-hidden="true" className="icon-sprite" focusable="false">
      <symbol id="icon-speaker" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 8.5a5 5 0 0 1 0 7" /><path d="M18.5 6a8 8 0 0 1 0 12" /></symbol>
      <symbol id="icon-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></symbol>
      <symbol id="icon-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 14.8-6.9" /><path d="M18 2v6h-6" /><path d="M21 12a9 9 0 0 1-14.8 6.9" /><path d="M6 22v-6h6" /></symbol>
      <symbol id="icon-shuffle" viewBox="0 0 24 24"><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="m4 4 5 5" /></symbol>
      <symbol id="icon-left" viewBox="0 0 24 24"><path d="M15 18 9 12l6-6" /></symbol>
      <symbol id="icon-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></symbol>
      <symbol id="icon-up" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></symbol>
      <symbol id="icon-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
      <symbol id="icon-trash" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 15h10l1-15" /><path d="M10 11v6" /><path d="M14 11v6" /></symbol>
      <symbol id="icon-star" viewBox="0 0 24 24"><path d="m12 2 3 6.4 7 .9-5.1 4.9 1.3 6.9L12 17.7 5.8 21.1l1.3-6.9L2 9.3l7-.9L12 2Z" /></symbol>
      <symbol id="icon-user" viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></symbol>
      <symbol id="icon-bag" viewBox="0 0 24 24"><path d="M6 8h12l1 12H5Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9 13h6" /></symbol>
      <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.4 8.1-8 10-4.6-1.9-8-5-8-10V6Z" /><path d="M12 7v10" /></symbol>
      <symbol id="icon-close" viewBox="0 0 24 24"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></symbol>
    </svg>
  );
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <use href={`#icon-${name}`} />
    </svg>
  );
}
