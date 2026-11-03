import { getHtmlProps } from "@kobalte/solidbase/server";
import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";

// The document shell (the index.html replacement), picked up by the
// src/Document.* convention; it must render the full <html> and ships no
// client JS. <HydrationScript /> is stripped from the prerendered shell in
// client mode and activates under `ssr: true`.
export default function Document(props: ParentProps) {
  return (
    <html {...getHtmlProps()}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HydrationScript />
      </head>
      <body>
        <div id="app">{props.children}</div>
      </body>
    </html>
  );
}
