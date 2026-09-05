export function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    box: (
      <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
        <path d="M12 13V3M3 8l9 5 9-5" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    star: <path d="M12 3 14.9 9l6.1.7-4.5 4.2 1.2 6.1L12 17.3 6.3 20l1.2-6.1L3 9.7 9.1 9z" />,
    trophy: (
      <>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M7 6H5a3 3 0 0 0 3 5M17 6h2a3 3 0 0 1-3 5" />
      </>
    ),
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    truck: (
      <>
        <path d="M1 7h13v10H1zM14 10h5l3 3v4h-8" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16v-5M12 16V8M16 16v-8" />
      </>
    ),
    megaphone: (
      <>
        <path d="M4 10v4h3l8 4V6L7 10z" />
        <path d="M19 8a4 4 0 0 1 0 8" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
    search: <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />,
    bell: (
      <>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 7 9-7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    cart: (
      <>
        <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
        <path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8H18" />
        <path d="M7 8h13l-1.4 7H8.2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    bag: <path d="M6 7h12l1 14H5zM9 7V5a3 3 0 0 1 6 0v2" />,
    trend: <path d="M4 17 10 11l4 4 7-8" />,
    activity: (
      <>
        <path d="M22 12h-4l-3 7-6-14-3 7H2" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="10" width="18" height="11" rx="1" />
        <path d="M12 10v11M3 14h18M12 10c-3-5-7-2-7 0h7M12 10c3-5 7-2 7 0h-7" />
      </>
    ),
    fullscreen: (
      <>
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    pencil: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </>
    ),
    upload: (
      <>
        <path d="M12 21V9M7 14l5-5 5 5M4 3h16" />
      </>
    ),
    filter: (
      <>
        <path d="M3 5h18l-7 8v5l-4 2v-7z" />
      </>
    ),
    check: <path d="M5 12 10 17 19 7" />,
    x: <path d="M6 6 18 18M18 6 6 18" />,
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </>
    ),
    bars: <path d="M4 19V10M10 19V5M16 19v-7M22 19V8" />,
    chevronLeft: <path d="m15 6-6 6 6 6" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </>
    ),
    ban: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m7.5 7.5 9 9" />
      </>
    ),
    usersPlus: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.35c-.7.3-1.4.85-1.4 1.65V14" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
    send: <path d="M3 11 21 3 13 21l-2-8z" />,
    save: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
    cloud: (
      <>
        <path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.5-1.6A4 4 0 0 0 7 18z" />
        <path d="M12 12v6M9.5 14.5 12 12l2.5 2.5" />
      </>
    ),
    barcode: (
      <>
        <path d="M4 6v12M7 6v12M9 6v12M13 6v12M15 6v12M19 6v12" />
      </>
    ),
    bulb: (
      <>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 1 4 10c-.8.7-1 1.5-1 2.5h-6c0-1-.2-1.8-1-2.5A6 6 0 0 1 12 3z" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="m21 15-5-5-9 9" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.7 5.23" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 1 0 7.07 7.07L13.3 18.77" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7h6l2 2h10v10H3z" />
      </>
    ),
    grip: (
      <>
        <circle cx="9" cy="7" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="7" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="9" cy="17" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="17" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3 21 21" />
        <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path d="M9.9 5.2A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3.2 3.8" />
        <path d="M6.1 6.1C3.7 7.8 2 12 2 12s4 7 10 7c1.5 0 2.9-.3 4.1-.9" />
      </>
    ),
    tree: (
      <>
        <path d="M8 5h8M12 5v14M12 12h7M12 19h7" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    tag: (
      <>
        <path d="M20.4 13.2 12.7 20.9a2 2 0 0 1-2.8 0L3 14V4h10l7.4 7.4a2 2 0 0 1 0 1.8z" />
        <circle cx="8.2" cy="8.2" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.6 2.6L16.5 9" />
      </>
    ),
    xCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 16 9 5 9-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    more: (
      <>
        <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    phone: (
      <>
        <path d="M7 3h4l1 5-2 1a12 12 0 0 0 5 5l1-2 5 1v4a2 2 0 0 1-2 2A16 16 0 0 1 5 7a2 2 0 0 1 2-2z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5c.6-.8 1.5-1.2 2.5-1.2 1.6 0 2.8 1 2.8 2.4S13.6 13 12 13" />
      </>
    ),
    crown: (
      <>
        <path d="M3 18h18l-1.5-9-4.5 3L12 6l-3 6-4.5-3z" />
        <path d="M5 18h14v2H5z" />
      </>
    ),
    pause: (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 7v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />,
    refresh: (
      <>
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 3v6h-6" />
      </>
    ),
    alarm: (
      <>
        <circle cx="12" cy="13" r="7" />
        <path d="M12 10v3l2 1.5M5 5l2.8 2.2M19 5l-2.8 2.2" />
      </>
    ),
    percent: (
      <>
        <circle cx="7.5" cy="7.5" r="2.2" />
        <circle cx="16.5" cy="16.5" r="2.2" />
        <path d="M17 7 7 17" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5h.01" />
      </>
    ),
    clipboard: (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        <path d="M9 10h6M9 14h6" />
      </>
    ),
    hourglass: (
      <>
        <path d="M6 4h12M6 20h12" />
        <path d="M8 4c0 3.2 8 4.2 8 8s-8 4.8-8 8" />
        <path d="M16 4c0 3.2-8 4.2-8 8s8 4.8 8 8" />
      </>
    ),
    exchange: (
      <>
        <path d="M7 7h11l-3-3" />
        <path d="M17 17H6l3 3" />
      </>
    ),
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
    sliders: (
      <>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M2 14h4M10 8h4M18 16h4" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    ticket: (
      <>
        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
        <path d="M9 7v10" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 4.3 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    calculator: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8M8 11h2M12 11h2M16 11h1M8 15h2M12 15h2M16 15h1M8 18h2M12 18h2M16 18h1" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
        <path d="M3 8V6a2 2 0 0 1 2-2h12" />
        <circle cx="17" cy="14" r="1.2" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}
