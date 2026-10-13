// ─── Palette ──────────────────────────────────────────────────────────────────
export const MAROON       = "#8B0000";
export const MAROON_DEEP  = "#6B0000";
export const MAROON_LIGHT = "#A80000";
export const GOLD         = "#C9A84C";
export const GOLD_LIGHT   = "#E8C97A";
export const GOLD_PALE    = "#F5E4A8";
export const CREAM        = "#FDF8F0";
export const WHITE        = "#FFFFFF";

// ─── Navigation (ids match the section ids on the page) ──────────────────────
export const NAV_LINKS = [
  { id: "home",        label: "Home"        },
  { id: "features",    label: "Features"    },
  { id: "benefits",    label: "Benefits"    },
  { id: "application", label: "Application" },
  { id: "faq",         label: "FAQ"         },
  { id: "team",        label: "Team"        },
];

// One short sentence under every section title.
export const SECTION_COPY = {
  features:    "Everything the library needs to lend, track, and report.",
  benefits:    "One system that saves time for every library user.",
  application: "See how LibraScan looks on every portal.",
  faq:         "Quick answers to what students and staff ask most.",
  team:        "The students and adviser behind this capstone project.",
};

// ─── Hero stats ───────────────────────────────────────────────────────────────
// `live: true` stats are read from the database at runtime (see useLandingStats
// in App.jsx); the others are fixed numbers.
export const STAT_TARGETS = [
  { key: "books",    live: true, suffix: "",  label: "Books in Catalog"    },
  { key: "users",    live: true, suffix: "",  label: "Registered Users"    },
  { key: "accuracy", target: 98, suffix: "%", label: "Scan Accuracy"       },
  { key: "campuses", target: 9,  suffix: "",  label: "University Campuses" },
];

// ─── System Features ──────────────────────────────────────────────────────────
export const FEATURES = [
  {
    iconKey: "scan",
    title: "Scan to Borrow and Return",
    desc: "Each book has its own QR code. One scan records a borrow or return, and overdue books are easy to spot.",
  },
  {
    iconKey: "visitor",
    title: "Visitor Monitoring",
    desc: "Students scan their ID to log their library visit. Daily records replace paper logbooks and can be searched, filtered by date, and printed.",
  },
  {
    iconKey: "catalog",
    title: "Online Catalog",
    desc: "Search and filter the catalog, check which books are available, and request to borrow. You are notified as soon as your request is approved.",
  },
  {
    iconKey: "portals",
    title: "Three Role-Based Portals",
    desc: "Students and employees browse, borrow, and track books. Librarians scan, manage books and users, and view reports. The Super Admin oversees all campuses and approves new books.",
  },
  {
    iconKey: "devices",
    title: "Mobile & Web Access",
    desc: "Use it on Android or in any web browser. Notifications and email reminders keep you updated on requests and due dates.",
  },
  {
    iconKey: "secure",
    title: "Secure & Reliable",
    desc: "Only PSU accounts can sign in, with two-step verification and control over signed-in devices. Each campus's data stays separate.",
  },
];

// ─── Built for Efficiency (tabbed) ────────────────────────────────────────────
export const PORTALS = [
  {
    id: "student",
    label: "Student/Employee Portal",
    points: [
      "Search books through an online catalog from anywhere.",
      "Check real-time book availability without visiting the library.",
      "Faster checkouts and returns via QR scanning.",
      "Student visit logs via ID QR scanning, no manual logging needed.",
    ],
  },
  {
    id: "librarian",
    label: "Librarian Portal",
    points: [
      "Makes borrowing and returning fast, accurate, and easy to track, so the library always knows where every book is and who has it.",
      "Book Management keeps the whole collection organized, accurate, and easy to register, so every book is easy to find, track, and borrow.",
      "Every book copy gets its own QR code, so each copy can be tracked individually.",
      "Reports and Analytics help the library buy the right books, plan for busy periods, and show proof of library usage to the administration, while saving time because reports can be downloaded or printed in a few clicks.",
    ],
  },
  {
    id: "superadmin",
    label: "Super Admin Portal",
    points: [
      "Manage campuses, librarian accounts, and user accounts from a single portal.",
      "Books across every campus can be monitored in one place, with totals, availability, and pending approvals always up to date.",
      "Get new book requests instantly, so approvals are never delayed.",
      "Reduce paperwork and manual follow-ups, since requests, approvals, and updates all happen online.",
    ],
  },
];

// ─── Application screenshots (files live in /public) ─────────────────────────
export const APP_SCREENSHOTS = [
  { src: "/User1.png",         alt: "Student portal, screen 1" },
  { src: "/User2.png",         alt: "Student portal, screen 2" },
  { src: "/User3.png",         alt: "Student portal, screen 3" },
  { src: "/adminportal1.png",  alt: "Librarian portal, screen 1" },
  { src: "/adminportal2.png",  alt: "Librarian portal, screen 2" },
  { src: "/adminportal3.png",  alt: "Librarian portal, screen 3" },
  { src: "/adminportal4.png",  alt: "Librarian portal, screen 4" },
  { src: "/adminportal5.png",  alt: "Librarian portal, screen 5" },
  { src: "/superadmin1.png",   alt: "Super Admin portal, screen 1" },
  { src: "/superadmin2.png",   alt: "Super Admin portal, screen 2" },
  { src: "/superadmin3.png",   alt: "Super Admin portal, screen 3" },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export const FAQS = [
  {
    q: "Who can use LibraScan?",
    a: "Students and employees of Pampanga State University can sign in with their PSU account. Librarian and Super Admin accounts are managed by the administration.",
  },
  {
    q: "How do I borrow and return a book?",
    a: "Pick the book you want, go to the QR scanner, then scan your ID QR code followed by the book's QR code to borrow it. To return a book, scan the same way at the scanner.",
  },
  {
    q: "How do I log my library visit?",
    a: "Scan your ID at the library's QR scanner. Your visit is recorded automatically, so there is no paper logbook to sign.",
  },
  {
    q: "Can I use LibraScan on my phone?",
    a: "Yes. LibraScan is available on Android and in any web browser, so you can browse the catalog and track your requests from your phone or computer.",
  },
  {
    q: "How is my account kept secure?",
    a: "Only verified PSU accounts can sign in. LibraScan also uses two-step verification, either a confirmation link sent to your email or a 6-digit code. You can see which devices are signed in and log out any you don't recognize.",
  },
  {
    q: "How long can I keep a book, and how will I know when it is due?",
    a: "The standard loan period is 3 days. LibraScan sends reminders by email and in the app when a book is due tomorrow, due today, or overdue.",
  },
];

// ─── Team ─────────────────────────────────────────────────────────────────────
export const ADVISER = {
  name:  "Policarpio, John Mark S., MIT",
  role:  "Capstone Adviser",
  photo: "/Caps_adviser.png",
};

export const TEAM = [
  { name: "Bondoc, Xandru C.",        role: "Website Developer",        photo: "/Bondoc.jpg"   },
  { name: "Pineda, Rusty A.",         role: "Application Developer",    photo: "/Pineda.jpg"   },
  { name: "Lacap, Edzel John R.",     role: "Documentation Specialist", photo: "/Lacap.jpg"    },
  { name: "Mata, Prince Christian S.",role: "System Analyst",           photo: "/Mata.jpg"     },
  { name: "Balagtas, Jerry Yan A.",   role: "QA Analyst",               photo: "/Balagtas.jpg" },
];

// ─── Footer ───────────────────────────────────────────────────────────────────
export const CAMPUSES = [
  "Apalit Campus",
  "Bacolor Campus",
  "Candaba Campus",
  "Floridablanca Campus",
  "Lubao Campus",
  "Mexico Campus",
  "Porac Campus",
  "San Fernando Campus",
  "Santo Tomas Campus",
];