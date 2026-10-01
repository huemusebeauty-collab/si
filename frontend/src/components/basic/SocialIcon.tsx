import type { ReactNode } from "react";

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  youtube: "YouTube",
  x: "X",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export function SocialIcon({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  const paths: Record<string, ReactNode> = {
    facebook: <path d="M14 8h3V4h-3c-3.3 0-5 1.9-5 5v3H6v4h3v4h4v-4h3.5l.5-4H13V9c0-.7.3-1 1-1Z" />,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>,
    threads: <><path d="M17.7 10.2c-.5-3.2-2.5-5.1-5.8-5.1-3.7 0-6.1 2.2-6.1 6.9 0 4.7 2.4 6.9 6.2 6.9 3.5 0 5.7-1.7 5.7-4.4 0-2.6-2-4.2-4.8-4.2-2.2 0-3.5 1-3.5 2.5 0 1.3 1.1 2.1 2.6 2.1 1.5 0 2.6-.8 2.9-2.1" /><path d="M12.1 8.1c3.7 0 6.4 1.7 7.2 4.8" /></>,
    youtube: <><path d="M21 8.1a2.5 2.5 0 0 0-1.8-1.8C17.6 6 12 6 12 6s-5.6 0-7.2.3A2.5 2.5 0 0 0 3 8.1 26 26 0 0 0 2.7 12 26 26 0 0 0 3 15.9a2.5 2.5 0 0 0 1.8 1.8c1.6.3 7.2.3 7.2.3s5.6 0 7.2-.3a2.5 2.5 0 0 0 1.8-1.8 26 26 0 0 0 .3-3.9 26 26 0 0 0-.3-3.9Z" /><path d="m10 9 5 3-5 3V9Z" /></>,
    x: <path d="M5 4h4.2l3 4.4L15.8 4H19l-5.3 6.1L19.5 20h-4.2l-3.5-5-3.8 5H5l5.8-6.7L5 4Z" />,
    pinterest: <path d="M12 3a9 9 0 0 0-3.2 17.4c-.1-1.5 0-3 .4-4.4l1.2-4.8s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.8 1.5 1.7 0 1-.6 2.4-.9 3.8-.3 1.1.6 2 1.7 2 2 0 3.4-2.1 3.4-5.1 0-2.6-1.9-4.5-4.7-4.5-3.2 0-5 2.4-5 4.9 0 .9.3 1.8.8 2.4.1.1.1.2.1.4l-.3 1.2c-.1.4-.4.5-.7.3-1.9-.8-3-3.2-3-5.1 0-3.7 2.7-7.2 7.9-7.2 4.2 0 7.4 3 7.4 6.9 0 4.1-2.6 7.4-6.2 7.4-1.2 0-2.4-.6-2.8-1.3l-.7 2.7c-.3 1.1-1.1 2.4-1.7 3.2A9 9 0 1 0 12 3Z" />,
    linkedin: <path d="M5 4.5A2 2 0 1 1 5 8.5a2 2 0 0 1 0-4ZM3 10h4v10H3V10Zm6 0h3.8v1.4h.1c.5-.9 1.7-1.9 3.6-1.9 3.8 0 4.5 2.5 4.5 5.7V20h-4v-4.2c0-1 0-2.4-1.5-2.4s-1.7 1.1-1.7 2.3V20H9V10Z" />,
    snapchat: <path d="M12 4c-2.7 0-4.5 1.9-4.5 4.7 0 1.5-.3 2.1-1.1 2.8-.5.4-1 .7-1.8.9.3.5.8.8 1.5 1 .4.1.7.3.7.7 0 .4-.3.7-.7.8.5.6 1.3.9 2.1 1 .5 1.4 1.5 2.1 3.8 2.1s3.3-.7 3.8-2.1c.8-.1 1.6-.4 2.1-1-.4-.1-.7-.4-.7-.8 0-.4.3-.6.7-.7.7-.2 1.2-.5 1.5-1-.8-.2-1.3-.5-1.8-.9-.8-.7-1.1-1.3-1.1-2.8C16.5 5.9 14.7 4 12 4Z" />,
    whatsapp: <><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" /><path d="M8.5 8.5c.3-.3.7-.3 1 0l1 1c.2.2.2.5 0 .8l-.4.5c.8 1.3 1.8 2.2 3.1 3.1l.5-.4c.3-.2.6-.2.8 0l1 1c.3.3.3.7 0 1-.6.6-1.3.9-2.1.7-2.1-.5-4.9-2.8-6.3-4.7-.6-.8-.5-1.6.1-2Z" /></>,
    telegram: <path d="m21 4-3.2 16-5.3-4.1-2.7 2.6-.2-4.2L18.4 7l-9.6 6.1-4.1-1.3L21 4Z" />,
  };
  const icon = paths[key] ?? <circle cx="12" cy="12" r="8" />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <title>{LABELS[key] ?? platform}</title>
      {icon}
    </svg>
  );
}
