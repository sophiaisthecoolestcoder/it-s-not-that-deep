import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, FileDown, ArrowLeft, Printer, Plus, X, GripVertical } from 'lucide-react';
import { useOfferStore } from '../store/offerStore';
import type { Offer, Salutation } from '../types';
import { ROOM_CATEGORIES, ROOM_GROUPS, getAmenitiesForRoom } from '../data/roomCategories';
import { formatDateGerman, formatEuro, getGreeting, generateId } from '../utils/helpers';
import { generateDocx } from '../utils/docxExport';

const todayISO = new Date().toISOString().split('T')[0];

/** Price per child per night by age bracket */
function childNightlyPrice(age: number, adultPrice: number): number {
  if (age <= 3) return 0;
  if (age <= 11) return 80;
  if (age <= 15) return 100;
  return adultPrice; // 16+ pays adult price
}

export default function OfferEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { offers, addOffer, updateOffer, addToast } = useOfferStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const isEditing = Boolean(id);

  // ── Form state ──────────────────────────────────────────────────
  const [salutation, setSalutation] = useState<Salutation>('Herr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');

  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [roomCategory, setRoomCategory] = useState(ROOM_CATEGORIES[0].id);
  const [customRoomCategory, setCustomRoomCategory] = useState('');
  const [adults, setAdults] = useState(2);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [pricePerNight, setPricePerNight] = useState('');
  const [totalPrice, setTotalPrice] = useState('');

  const [offerDate, setOfferDate] = useState(todayISO);
  const [employeeName, setEmployeeName] = useState('');

  // ── Load existing offer ─────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const existing = offers.find(o => o.id === id);
    if (!existing) return;

    setSalutation(existing.client.salutation);
    setFirstName(existing.client.firstName);
    setLastName(existing.client.lastName);
    setStreet(existing.client.street);
    setZipCode(existing.client.zipCode);
    setCity(existing.client.city);
    setEmail(existing.client.email);

    setArrivalDate(existing.arrivalDate);
    setDepartureDate(existing.departureDate);
    setRoomCategory(existing.roomCategory);
    setCustomRoomCategory(existing.customRoomCategory || '');
    setAdults(existing.adults ?? 2);
    setChildrenAges(existing.childrenAges ?? []);
    setPricePerNight(existing.pricePerNight);
    setTotalPrice(existing.totalPrice);

    setOfferDate(existing.date);
    setEmployeeName(existing.employeeName);
  }, [id, offers]);

  // ── Derived values ─────────────────────────────────────────────
  const isCustomRoom = roomCategory === 'custom';
  const roomCat = ROOM_CATEGORIES.find(r => r.id === roomCategory);
  const roomName = isCustomRoom ? customRoomCategory : (roomCat?.name ?? '');
  const amenities = getAmenitiesForRoom(roomName);

  const nights =
    arrivalDate && departureDate
      ? Math.max(0, Math.round((new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86400000))
      : 0;

  // Children cost
  const adultPriceNum = parseFloat(pricePerNight) || 0;
  const childrenCostPerNight = childrenAges.reduce((sum, age) => sum + childNightlyPrice(age, adultPriceNum), 0);

  // Auto-calculate total
  const calculatedTotal =
    pricePerNight && nights > 0 && adults > 0
      ? ((parseFloat(pricePerNight) * adults + childrenCostPerNight) * nights).toFixed(2)
      : '';
  const effectiveTotal = totalPrice || calculatedTotal;

  // Guest text for preview
  function guestText(): string {
    const adultWord = adults === 1 && salutation === 'Herr' ? 'Erwachsenen' : 'Erwachsene';
    let text = `für ${adults} ${adultWord}`;
    if (childrenAges.length > 0) {
      const parts = childrenAges.map(age => `1 Kind im Alter von ${age} ${age === 1 ? 'Jahr' : 'Jahren'}`);
      text += ` und ${parts.join(' und ')}`;
    }
    return text;
  }

  // ── Children helpers ────────────────────────────────────────────
  function addChild() {
    setChildrenAges(prev => [...prev, 5]);
  }
  function removeChild(index: number) {
    setChildrenAges(prev => prev.filter((_, i) => i !== index));
  }
  function setChildAge(index: number, age: number) {
    setChildrenAges(prev => prev.map((a, i) => (i === index ? age : a)));
  }

  // ── Build offer data ────────────────────────────────────────────
  function buildOfferData(): Omit<Offer, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      client: { salutation, firstName, lastName, street, zipCode, city, email },
      date: offerDate,
      arrivalDate,
      departureDate,
      roomCategory,
      customRoomCategory,
      adults,
      children: childrenAges.length,
      childrenAges,
      pricePerNight,
      totalPrice,
      employeeName,
      notes: '',
      status: 'draft',
    };
  }

  function handleSave() {
    const data = buildOfferData();
    if (isEditing && id) {
      updateOffer(id, data);
      addToast({ type: 'success', title: 'Angebot aktualisiert' });
    } else {
      const newId = addOffer(data);
      addToast({ type: 'success', title: 'Angebot gespeichert' });
      navigate(`/angebote/${newId}`, { replace: true });
    }
  }

  function handleExportDocx() {
    const exportOffer: Offer = {
      ...buildOfferData(),
      id: id ?? generateId(),
      roomCategory: roomName,
      totalPrice: effectiveTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    generateDocx(exportOffer);
  }

  // ── Resizable split ────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(45); // percentage
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(25, Math.min(75, pct)));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex items-start select-none" style={{ gap: 0 }}>
      {/* ─── LEFT: Form ─────────────────────────────────────────── */}
      <div className="shrink-0 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2" style={{ width: `${leftWidth}%` }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button className="btn-primary flex items-center gap-2" onClick={handleSave}><Save size={16} /> Speichern</button>
          <button className="btn-secondary flex items-center gap-2" onClick={handleExportDocx}><FileDown size={16} /> Word</button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => window.print()}><Printer size={16} /> PDF</button>
          <button className="btn-ghost flex items-center gap-2" onClick={() => navigate('/angebote')}><ArrowLeft size={16} /> Zurück</button>
        </div>

        <div className="bg-white rounded shadow-sm p-6 space-y-0">
          <h2 className="text-lg font-bold text-dark-700 mb-4">
            {isEditing ? 'Angebot bearbeiten' : 'Neues Angebot'}
          </h2>

          {/* Section: Kundendaten */}
          <div className="border-b-2 border-dotted border-brand-400/30 pb-5 mb-5">
            <h3 className="label mb-3">Kundendaten</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Anrede</label>
                <select className="input" value={salutation} onChange={e => setSalutation(e.target.value as Salutation)}>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                  <option value="Familie">Familie</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Vorname</label><input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div><label className="label">Nachname</label><input className="input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div><label className="label">Straße</label><input className="input" value={street} onChange={e => setStreet(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">PLZ</label><input className="input" value={zipCode} onChange={e => setZipCode(e.target.value)} /></div>
                <div><label className="label">Ort</label><input className="input" value={city} onChange={e => setCity(e.target.value)} /></div>
              </div>
              <div><label className="label">E-Mail</label><input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>
          </div>

          {/* Section: Aufenthalt */}
          <div className="border-b-2 border-dotted border-brand-400/30 pb-5 mb-5">
            <h3 className="label mb-3">Aufenthalt</h3>
            <div className="space-y-3">
              <div><label className="label">Anreise</label><input type="date" className="input" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} /></div>
              <div><label className="label">Abreise</label><input type="date" className="input" value={departureDate} onChange={e => setDepartureDate(e.target.value)} /></div>

              {/* Room category */}
              <div>
                <label className="label">Zimmer</label>
                <select className="input" value={roomCategory} onChange={e => setRoomCategory(e.target.value)}>
                  {ROOM_GROUPS.map(group => (
                    <optgroup key={group} label={group}>
                      {ROOM_CATEGORIES.filter(r => r.group === group).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {isCustomRoom && (
                <div>
                  <label className="label">Eigene Zimmerkategorie</label>
                  <input className="input" placeholder="z.B. Penthouse Suite" value={customRoomCategory} onChange={e => setCustomRoomCategory(e.target.value)} />
                </div>
              )}

              {/* Adults */}
              <div>
                <label className="label">Erwachsene</label>
                <input type="number" min="1" className="input" value={adults} onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>

              {/* Children with ages */}
              <div>
                <label className="label">Kinder</label>
                {childrenAges.length === 0 ? (
                  <p className="text-xs text-dark-300 mb-1">Keine Kinder hinzugefügt</p>
                ) : (
                  <div className="space-y-2 mb-2">
                    {childrenAges.map((age, i) => {
                      const price = childNightlyPrice(age, adultPriceNum);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-dark-400 w-14 shrink-0">Kind {i + 1}:</span>
                          <input
                            type="number"
                            min="0"
                            max="17"
                            className="input w-20"
                            value={age}
                            onChange={e => setChildAge(i, Math.max(0, Math.min(17, parseInt(e.target.value) || 0)))}
                          />
                          <span className="text-xs text-dark-400">Jahre</span>
                          <span className="text-xs text-dark-300 ml-auto">
                            {price === 0 ? 'kostenfrei' : `${price},00 € / Nacht`}
                          </span>
                          <button onClick={() => removeChild(i)} className="text-dark-300 hover:text-red-800 transition-all"><X size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={addChild} className="text-xs text-brand-400 hover:text-brand-600 inline-flex items-center gap-1 transition-all">
                  <Plus size={12} /> Kind hinzufügen
                </button>
              </div>

              {/* Price */}
              <div>
                <label className="label">Preis pro Person pro Nacht</label>
                <div className="relative">
                  <input type="number" className="input pr-8" value={pricePerNight} onChange={e => setPricePerNight(e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">€</span>
                </div>
              </div>

              <div>
                <label className="label">
                  Preis Gesamt
                  {!totalPrice && calculatedTotal && (
                    <span className="normal-case tracking-normal text-dark-300 ml-1">(auto: {formatEuro(calculatedTotal)})</span>
                  )}
                </label>
                <div className="relative">
                  <input type="text" inputMode="decimal" className="input pr-8" value={totalPrice} onChange={e => setTotalPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={calculatedTotal || ''} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Angebot */}
          <div className="border-b-2 border-dotted border-brand-400/30 pb-5 mb-5">
            <h3 className="label mb-3">Angebot</h3>
            <div className="space-y-3">
              <div><label className="label">Datum des Angebots</label><input type="date" className="input" value={offerDate} onChange={e => setOfferDate(e.target.value)} /></div>
              <div><label className="label">Name Mitarbeiter/in</label><input className="input" value={employeeName} onChange={e => setEmployeeName(e.target.value)} /></div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── DRAG HANDLE ──────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        className="w-3 shrink-0 flex items-center justify-center cursor-col-resize hover:bg-brand-200/40 transition-colors self-stretch"
        title="Breite anpassen"
      >
        <GripVertical size={14} className="text-dark-300" />
      </div>

      {/* ─── RIGHT: Live Preview ────────────────────────────────── */}
      <div className="flex-1 max-h-[calc(100vh-4rem)] overflow-y-auto pl-2">
        <div
          ref={previewRef}
          className="print-area bg-white rounded shadow-sm px-16 py-14 font-doc text-dark-700 text-[13px]"
          style={{ lineHeight: 1.25 }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img src="/bleiche-logo-text.png" alt="Bleiche Resort & Spa" className="w-[200px]" />
          </div>

          {/* Client address */}
          <div className="font-bold">{salutation} {firstName} {lastName}</div>
          <div className="font-bold">{street}</div>
          <div className="font-bold mb-2">{zipCode} {city}</div>

          <div className="mb-2">per E-Mail an {email}</div>

          <div className="text-right mb-3">Burg (Spreewald), {formatDateGerman(offerDate)}</div>

          <div className="text-lg font-bold mb-2">Angebot</div>

          <p className="mb-4 text-justify">{getGreeting(salutation, lastName)},</p>

          <p className="mb-2 text-justify">
            herzlichen Dank für Ihre Anfrage und für Ihr Interesse an einem Aufenthalt
            in unserem Haus. Gerne übersenden wir Ihnen folgendes Angebot:
          </p>

          {/* Details */}
          <hr className="border-brand-400/30 my-2" />
          <div className="mb-2">
            <p className="flex"><span className="font-bold w-[90px] shrink-0">Anreise:</span><span>{formatDateGerman(arrivalDate)}</span></p>
            <p className="flex mb-4"><span className="font-bold w-[90px] shrink-0">Abreise:</span><span>{formatDateGerman(departureDate)}</span></p>
            <p className="flex"><span className="font-bold w-[90px] shrink-0">Zimmer:</span><span>{roomName}</span></p>
            <p className="mb-4" style={{ marginLeft: '90px' }}>{guestText()}</p>
            <p className="flex mb-4"><span className="font-bold w-[90px] shrink-0">Preis:</span><span>{pricePerNight ? `${formatEuro(pricePerNight)} pro Person pro Nacht` : '—'}</span></p>
          </div>

          {/* Leistungen */}
          <p className="flex"><span className="font-bold w-[90px] shrink-0">Leistungen:</span><span className="underline">Das ist alles im Zimmerpreis enthalten:</span></p>
          <ul className="mb-2 list-disc" style={{ marginLeft: '90px', paddingLeft: '14px' }}>
            {amenities.map((item, i) => (<li key={i}>{i === 0 ? 'Übernachtung in Ihrem ausgewählten Wohlfühlzimmer' : item}</li>))}
          </ul>

          {/* Genusspauschale */}
          <p className="mb-0.5 underline" style={{ marginLeft: '90px' }}>Das alles ist in unserer Genusspauschale enthalten:</p>
          <ul className="mb-2 list-disc" style={{ marginLeft: '90px', paddingLeft: '14px' }}>
            <li>Frühstück ab 7:30 Uhr, wann immer sie ausgeschlafen haben</li>
            <li>Kulinarische Kleinigkeiten in unserem Bios für zwischendurch</li>
            <li>Unser exklusives Bleiche-Abendmenü</li>
          </ul>

          {/* Total price */}
          <hr className="border-brand-400/30 my-2" />
          <p className="flex font-bold my-2">
            <span className="w-[120px] shrink-0">Preis Gesamt:</span>
            <span>{effectiveTotal ? formatEuro(effectiveTotal) : '—'}</span>
          </p>
          <p className="text-[11px] text-dark-400 mb-2" style={{ marginLeft: '120px' }}>(zzgl. je € 1,00 Fremdenverkehrsabgabe &amp; je € 2,00 Kurbeitrag pro Nacht)</p>
          <hr className="border-brand-400/30 my-2" />

          {/* Info paragraphs */}
          <p className="mb-1.5 text-justify">
            Unsere Zimmer und Suiten sowie unsere Landtherme stehen <span className="font-bold">am Anreisetag ab 16.00 Uhr</span> und <span className="font-bold">am Abreisetag bis 12.00 Uhr</span> zur Verfügung.
          </p>
          <p className="mb-1.5 text-justify">
            Unsere SPA-Quelven stehen Ihnen gern für Ihre Reservierungswünsche für Anwendungen in der Landtherme zur Verfügung (Tel. +49 (0)35603-62519 sowie landtherme@bleiche.de).
          </p>
          <p className="mb-1.5 text-justify">
            Unsere Stornierungsbedingungen finden Sie auf unserer Homepage www.bleiche.de unter der Rubrik &quot;Impressum/AGB&quot;.
          </p>
          <p className="mb-4 text-justify">
            Wir freuen uns, wenn Ihnen unser Angebot zusagt und wir Sie als Gäste in unserem Haus begrüßen dürfen.
          </p>

          {/* Closing */}
          <div className="mt-4">
            <p>Mit freundlichen Grüßen</p>
            <p className="font-bold uppercase tracking-wide mb-3">BLEICHE RESORT &amp; SPA</p>
            <div className="flex justify-between">
              <span>Familie Clausing</span>
              <div className="text-right">
                <p>{employeeName}</p>
                <p>Reservierung</p>
              </div>
            </div>
          </div>

          <div className="print-page-number text-right text-xs text-dark-400"></div>
        </div>
      </div>
    </div>
  );
}
