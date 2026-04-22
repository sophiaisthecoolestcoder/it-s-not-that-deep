import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import { ROOM_CATEGORIES, getAmenitiesForRoom } from '../data/roomCategories';
import type { Offer } from '../types/offer';
import { formatDateGerman, formatEuro, getGreeting } from './helpers';

// ─── Constants ──────────────────────────────────────────────────────────────

const FONT = 'Alegreya Sans';
const BODY_SIZE = 22; // 11pt (half-points)
const HEADING_SIZE = 28; // 14pt
const SMALL_SIZE = 20; // 10pt
const LINE_SPACING = 300; // 1.25 line spacing

const LOGO_WIDTH = 180;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH / 1.415);

const TAB_POS = 1800;
const BULLET_LEFT = TAB_POS;
const BULLET_HANG = 240;

const GENUSSPAUSCHALE = [
  'Frühstück ab 7:30 Uhr, wann immer sie ausgeschlafen haben',
  'Kulinarische Kleinigkeiten in unserem Bios für zwischendurch',
  'Unser exklusives Bleiche-Abendmenü',
];

// ─── Text helpers ───────────────────────────────────────────────────────────

function run(text: string, opts: Record<string, unknown> = {}): TextRun {
  return new TextRun({ text, font: FONT, size: BODY_SIZE, ...opts });
}
function boldRun(text: string, opts: Record<string, unknown> = {}): TextRun {
  return new TextRun({ text, font: FONT, size: BODY_SIZE, bold: true, ...opts });
}
function tabRun(): TextRun {
  return new TextRun({ children: ['\t'], font: FONT, size: BODY_SIZE });
}
function para(children: TextRun[], opts: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({ children, ...opts });
}
function hrLine(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C2A98C' } },
    spacing: { after: 120 },
    children: [],
  });
}
function labelValue(label: string, value: string, opts: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: TAB_POS }],
    indent: { left: TAB_POS, hanging: TAB_POS },
    children: [boldRun(label), tabRun(), run(value)],
    ...opts,
  });
}
function bullet(text: string, opts: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({
    indent: { left: BULLET_LEFT + BULLET_HANG, hanging: BULLET_HANG },
    tabStops: [{ type: TabStopType.LEFT, position: BULLET_LEFT + BULLET_HANG }],
    children: [run('•\t'), run(text)],
    ...opts,
  });
}

// ─── Font Embedding (OOXML obfuscation) ─────────────────────────────────────

function generateGUID(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `{${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}}`;
}

function obfuscateFont(fontData: Uint8Array, guid: string): Uint8Array {
  const hexStr = guid.replace(/[{}\-]/g, '');
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i++) key[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  key.reverse();
  const result = new Uint8Array(fontData);
  for (let i = 0; i < 32; i++) result[i] = fontData[i] ^ key[i % 16];
  return result;
}

async function embedFonts(docxBlob: Blob): Promise<Blob> {
  let regularData: ArrayBuffer | null = null;
  let boldData: ArrayBuffer | null = null;
  try {
    const [regResp, boldResp] = await Promise.all([
      fetch('/fonts/AlegreyaSans-Regular.ttf'),
      fetch('/fonts/AlegreyaSans-Bold.ttf'),
    ]);
    if (regResp.ok) regularData = await regResp.arrayBuffer();
    if (boldResp.ok) boldData = await boldResp.arrayBuffer();
  } catch {
    return docxBlob;
  }
  if (!regularData && !boldData) return docxBlob;

  const zip = await JSZip.loadAsync(docxBlob);
  const fonts: { filename: string; data: Uint8Array; guid: string; relId: string; type: string }[] = [];

  if (regularData) {
    const guid = generateGUID();
    const obfuscated = obfuscateFont(new Uint8Array(regularData), guid);
    const filename = guid.replace(/[{}]/g, '') + '.odttf';
    fonts.push({ filename, data: obfuscated, guid, relId: 'rIdFontReg', type: 'regular' });
  }
  if (boldData) {
    const guid = generateGUID();
    const obfuscated = obfuscateFont(new Uint8Array(boldData), guid);
    const filename = guid.replace(/[{}]/g, '') + '.odttf';
    fonts.push({ filename, data: obfuscated, guid, relId: 'rIdFontBold', type: 'bold' });
  }

  for (const f of fonts) zip.file(`word/fonts/${f.filename}`, f.data);

  let contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  if (!contentTypes.includes('obfuscatedFont')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>\n</Types>',
    );
    zip.file('[Content_Types].xml', contentTypes);
  }

  let fontTable = await zip.file('word/fontTable.xml')!.async('string');
  const regFont = fonts.find((f) => f.type === 'regular');
  const boldFont = fonts.find((f) => f.type === 'bold');
  let embedXml = '';
  if (regFont) embedXml += `<w:embedRegular w:fontKey="${regFont.guid}" r:id="${regFont.relId}"/>`;
  if (boldFont) embedXml += `<w:embedBold w:fontKey="${boldFont.guid}" r:id="${boldFont.relId}"/>`;

  if (fontTable.includes(`w:name="${FONT}"`)) {
    fontTable = fontTable.replace(
      new RegExp(`(<w:font\\s+w:name="${FONT}"[^>]*>)`),
      `$1${embedXml}`,
    );
  } else {
    fontTable = fontTable.replace(
      '</w:fonts>',
      `<w:font w:name="${FONT}">${embedXml}<w:charset w:val="00"/></w:font></w:fonts>`,
    );
  }
  zip.file('word/fontTable.xml', fontTable);

  let fontRels = '';
  const existingRels = zip.file('word/_rels/fontTable.xml.rels');
  if (existingRels) {
    fontRels = await existingRels.async('string');
  } else {
    fontRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  }
  for (const f of fonts) {
    const rel = `<Relationship Id="${f.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${f.filename}"/>`;
    fontRels = fontRels.replace('</Relationships>', `${rel}</Relationships>`);
  }
  zip.file('word/_rels/fontTable.xml.rels', fontRels);

  return zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ─── Main Export Function ───────────────────────────────────────────────────

export async function generateOfferDocx(offer: Offer): Promise<void> {
  const content: Paragraph[] = [];

  // 1. Logo
  let logoData: ArrayBuffer | null = null;
  try {
    const resp = await fetch('/bleiche-logo-text.png');
    if (resp.ok) logoData = await resp.arrayBuffer();
  } catch {
    /* fallback */
  }
  if (logoData) {
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new ImageRun({
            data: logoData,
            transformation: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
            type: 'png',
          }),
        ],
      }),
    );
  } else {
    content.push(
      para([boldRun('BLEICHE RESORT & SPA', { size: HEADING_SIZE })], { spacing: { after: 300 } }),
    );
  }

  // 2. Client address
  content.push(
    para([boldRun(`${offer.salutation} ${offer.first_name} ${offer.last_name}`.trim())]),
  );
  if (offer.street) content.push(para([boldRun(offer.street)]));
  if (offer.zip_code || offer.city) {
    content.push(para([boldRun(`${offer.zip_code} ${offer.city}`.trim())], { spacing: { after: 120 } }));
  }

  // 3. E-Mail
  if (offer.email) {
    content.push(para([run(`per E-Mail an ${offer.email}`)], { spacing: { after: 120 } }));
  }

  // 4. Date
  const dateIso = offer.offer_date || (offer.created_at ? offer.created_at.slice(0, 10) : '');
  content.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [run(`Burg (Spreewald), ${formatDateGerman(dateIso)}`)],
    }),
  );

  // 5. Heading
  content.push(para([boldRun('Angebot', { size: HEADING_SIZE })], { spacing: { after: 120 } }));

  // 6. Greeting
  content.push(
    para([run(`${getGreeting(offer.salutation, offer.last_name)},`)], {
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240 },
    }),
  );

  // 7. Intro
  content.push(
    para(
      [
        run(
          'herzlichen Dank für Ihre Anfrage und für Ihr Interesse an einem Aufenthalt in unserem Haus. Gerne übersenden wir Ihnen folgendes Angebot:',
        ),
      ],
      { alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } },
    ),
  );

  content.push(hrLine());

  // 8. Anreise / Abreise
  if (offer.arrival_date) content.push(labelValue('Anreise:', formatDateGerman(offer.arrival_date)));
  if (offer.departure_date) {
    content.push(
      labelValue('Abreise:', formatDateGerman(offer.departure_date), { spacing: { after: 240 } }),
    );
  }

  // 9. Zimmer + Gäste.
  // `offer.room_category` is the category *id* (e.g. 'kleines-dz'); resolve it
  // to the display name so the amenities lookup below picks the right group.
  const roomCat = ROOM_CATEGORIES.find((r) => r.id === offer.room_category);
  const roomName = offer.custom_room_category || roomCat?.name || offer.room_category || '';
  content.push(labelValue('Zimmer:', roomName));

  const adultWord = offer.adults === 1 && offer.salutation === 'Herr' ? 'Erwachsenen' : 'Erwachsene';
  let guestLine = `für ${offer.adults} ${adultWord}`;
  const ages = offer.children_ages ?? [];
  if (ages.length > 0) {
    const parts = ages.map((age) => `1 Kind im Alter von ${age} ${age === 1 ? 'Jahr' : 'Jahren'}`);
    guestLine += ` und ${parts.join(' und ')}`;
  }
  content.push(
    new Paragraph({
      indent: { left: TAB_POS },
      spacing: { after: 240 },
      children: [run(guestLine)],
    }),
  );

  // 10. Preis pro Nacht
  if (offer.price_per_night) {
    content.push(
      labelValue('Preis:', `${formatEuro(offer.price_per_night)} pro Person pro Nacht`, {
        spacing: { after: 240 },
      }),
    );
  }

  // 11. Leistungen
  content.push(
    new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: TAB_POS }],
      indent: { left: TAB_POS, hanging: TAB_POS },
      children: [boldRun('Leistungen:'), tabRun(), run('Das ist alles im Zimmerpreis enthalten:', { underline: {} })],
      spacing: { after: 60 },
    }),
  );
  const amenities = getAmenitiesForRoom(roomName);
  amenities.forEach((item, i) => {
    const text = i === 0 ? 'Übernachtung in Ihrem ausgewählten Wohlfühlzimmer' : item;
    content.push(bullet(text, i === amenities.length - 1 ? { spacing: { after: 200 } } : {}));
  });

  // 12. Genusspauschale
  content.push(
    new Paragraph({
      indent: { left: TAB_POS },
      children: [run('Das alles ist in unserer Genusspauschale enthalten:', { underline: {} })],
      spacing: { after: 60 },
    }),
  );
  GENUSSPAUSCHALE.forEach((item, i) => {
    content.push(bullet(item, i === GENUSSPAUSCHALE.length - 1 ? { spacing: { after: 200 } } : {}));
  });

  content.push(hrLine());

  // 13. Preis Gesamt
  if (offer.total_price) {
    content.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.LEFT, position: TAB_POS }],
        indent: { left: TAB_POS, hanging: TAB_POS },
        children: [boldRun('Preis Gesamt:'), tabRun(), boldRun(formatEuro(offer.total_price))],
        spacing: { after: 60 },
      }),
    );
    content.push(
      new Paragraph({
        indent: { left: TAB_POS },
        spacing: { after: 120 },
        children: [
          run('(zzgl. je € 1,00 Fremdenverkehrsabgabe & je € 2,00 Kurbeitrag pro Nacht)', { size: SMALL_SIZE }),
        ],
      }),
    );
    content.push(hrLine());
  }

  // 14. Closing info
  content.push(
    para(
      [
        run('Unsere Zimmer und Suiten sowie unsere Landtherme stehen '),
        boldRun('am Anreisetag ab 16.00 Uhr'),
        run(' und '),
        boldRun('am Abreisetag bis 12.00 Uhr'),
        run(' zur Verfügung.'),
      ],
      { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } },
    ),
  );
  content.push(
    para(
      [
        run(
          'Unsere SPA-Quellen stehen Ihnen gern für Ihre Reservierungswünsche für Anwendungen in der Landtherme zur Verfügung (Tel. +49 (0)35603-62519 sowie landtherme@bleiche.de).',
        ),
      ],
      { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } },
    ),
  );
  content.push(
    para(
      [run('Unsere Stornierungsbedingungen finden Sie auf unserer Homepage www.bleiche.de unter der Rubrik "Impressum/AGB".')],
      { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } },
    ),
  );
  content.push(
    para(
      [run('Wir freuen uns, wenn Ihnen unser Angebot zusagt und wir Sie als Gäste in unserem Haus begrüßen dürfen.')],
      { alignment: AlignmentType.JUSTIFIED, spacing: { after: 300 } },
    ),
  );

  // 15. Signature
  content.push(para([run('Mit freundlichen Grüßen')]));
  content.push(para([boldRun('BLEICHE RESORT & SPA')], { spacing: { after: 200 } }));
  content.push(
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [run('Familie Clausing'), tabRun(), run(offer.employee_name || '')],
    }),
  );
  content.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Reservierung')] }));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })],
              }),
            ],
          }),
        },
        children: content,
      },
    ],
  });

  let blob = await Packer.toBlob(doc);
  blob = await embedFonts(blob);

  const d = dateIso ? new Date(dateIso) : new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
  saveAs(blob, `Angebot_${offer.last_name || 'Gast'}_${dateStr}.docx`);
}
