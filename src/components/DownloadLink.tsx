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
    <a href={href} className={className} download={download}>
      {children}
    </a>
  );
}
