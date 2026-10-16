// apps/web/src/components/ui/Link.tsx
import React from 'react';
import NextLink from 'next/link';
import { Icon } from './Icon';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  isExternal?: boolean;
}

export function Link({
  href,
  isExternal,
  children,
  className = '',
  ...props
}: LinkProps) {
  const external = isExternal || href.startsWith('http://') || href.startsWith('https://');

  const content = (
    <>
      <span>{children}</span>
      {external && (
        <span className="inline-flex items-center ml-1">
          <Icon name="external" size={14} ariaHidden={true} className="inline align-baseline" />
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      )}
    </>
  );

  const classes = `text-spruce-700 underline underline-offset-2 decoration-1 hover:decoration-2 transition-all ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <NextLink href={href} className={classes} {...props}>
      {content}
    </NextLink>
  );
}
