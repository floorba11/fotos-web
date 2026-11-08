"use client";

import { showToast } from "@/lib/toast";

export function DownloadLink({
  href,
  className,
  children,
  download,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  download?: boolean | string;
}) {
  return (
    <a
      href={href}
      className={className}
      download={download}
      // Download wird nicht verhindert, nur der Hinweis eingeblendet
      onClick={() =>
        showToast({
          message: "Download gestartet! Vergiss nicht, @floorba11 auf Instagram zu taggen.",
          copy: { label: "@floorba11 kopieren", text: "@floorba11" },
        })
      }
    >
      {children}
    </a>
  );
}
