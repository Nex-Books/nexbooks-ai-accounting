import React from "react";

export default function RootHead() {
  return (
    <>
      <link rel="apple-touch-icon" href="/logo192.png" />
      <link rel="manifest" href="/manifest.json" />
      <link
        rel="shortcut icon"
        type="image/x-icon"
        href={process.env.NEXT_PUBLIC_BASE_PATH || '' + '/favicon.ico'}
      />
      <title>NexBooks — AI-Powered Accounting</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0F766E" />
      <meta
        name="description"
        content="NexBooks — AI-powered accounting platform for modern businesses."
      />
    </>
  );
}
