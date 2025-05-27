import React from 'react';

export default function NotFoundLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 – Not Found</title>
      </head>
      <body>
         {children}
      </body>
    </html>
  );
} 