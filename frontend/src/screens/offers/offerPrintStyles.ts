// Print stylesheet for the Offer document. Injected once on the web build so
// `window.print()` / Ctrl+P captures exactly the paper, not the app shell.
//
// React Native Web renders `dataSet={{offerDocument: 'true'}}` as
// `data-offer-document="true"` and `dataSet={{offerChrome: 'true'}}` as
// `data-offer-chrome="true"`, which is what these selectors target.

const CSS = `
@media print {
  @page {
    size: A4;
    margin: 18mm 14mm;
  }

  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Hide anything explicitly marked as "chrome": sidebar, top nav, toolbars,
     toast container, notes block, etc. Every container on the way from body
     to the document is kept visible by the rule below. */
  [data-offer-chrome="true"] {
    display: none !important;
  }

  /* Collapse the app shell so the document is the only thing on the page. */
  body * {
    visibility: hidden;
  }
  [data-offer-document="true"],
  [data-offer-document="true"] * {
    visibility: visible;
  }
  [data-offer-document="true"] {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
  }

  /* Inside the paper, hide edit-affordance styling so values look like flat text. */
  [data-offer-document="true"] input,
  [data-offer-document="true"] textarea {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
}
`;

let injected = false;

export function injectOfferPrintStyles() {
  if (injected) return;
  if (typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.setAttribute('data-bleiche-offer-print', 'true');
  style.textContent = CSS;
  document.head.appendChild(style);
}
