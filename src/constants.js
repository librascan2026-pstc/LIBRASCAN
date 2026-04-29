// ─── Color Tokens ────────────────────────────────────────────────────────────
export const MAROON       = "#8B0000";
export const MAROON_DEEP  = "#6B0000";
export const MAROON_LIGHT = "#A80000";
export const GOLD         = "#C9A84C";
export const GOLD_LIGHT   = "#E8C97A";
export const GOLD_PALE    = "#F5E4A8";
export const CREAM        = "#FDF8F0";
export const WHITE        = "#FFFFFF";

// ─── Features ─────────────────────────────────────────────────────────────────
export const FEATURES = [
  {
    iconKey: "qr",
    title: "QR Book Management",
    desc: "Every book gets a unique QR code. Automate checkouts, returns, and inventory tracking with a single scan, no manual entries.",
  },
  {
    iconKey: "attendance",
    title: "Attendance Monitoring",
    desc: "Real-time student and staff visit logging via QR scan. Replace paper sign-in sheets with instant, accurate digital records.",
  },
  {
    iconKey: "catalog",
    title: "Online Catalog",
    desc: "Search, browse, and check book availability from anywhere, web or mobile. A smart digital library at your fingertips.",
  },
  {
    iconKey: "dashboard",
    title: "Admin Dashboard",
    desc: "Comprehensive analytics, reports, and records in one view. Empower library management with data-driven insights.",
  },
  {
    iconKey: "mobile",
    title: "Mobile & Web Access",
    desc: "Fully cross-platform: compatible with Android, iOS, and all browsers. Access the system from any device, anywhere.",
  },
  {
    iconKey: "shield",
    title: "Secure & Reliable",
    desc: "Built on robust architecture following ISO 25010 standards, ensuring accuracy, security, and system reliability.",
  },
];

// ─── Benefits ─────────────────────────────────────────────────────────────────
export const BENEFITS = {
  students: {
    title: " Students",
    points: [
      "Search books through an online catalog from anywhere",
      "Check real-time book availability without visiting the library",
      "Instant QR-based attendance, no manual sign-in needed",
      "Faster checkouts and returns via QR scanning",
    ],
  },
  staff: {
    title: " Library Staff",
    points: [
      "Automate checkout, return, and inventory tracking",
      "Eliminate manual data entry and paper records",
      "QR code auto-generation for newly added books",
      "Focus on service instead of administrative tasks",
    ],
  },
  admin: {
    title: " Administrators",
    points: [
      "Real-time dashboard with transaction and attendance logs",
      "Generate detailed reports for decision-making",
      "Analytics on system usage and book circulation",
      "Organized, accurate data at a glance",
    ],
  },
};

// ─── Process Steps ─────────────────────────────────────────────────────────────
export const STEPS = [
  { num: "01", title: "Requirements Gathering", desc: "Interviews and observations with library staff and students of PSU Sto. Tomas Campus to define system requirements." },
  { num: "02", title: "System Design",          desc: "Architecture, database structure, UI design, and QR code workflow designed for both web and mobile platforms." },
  { num: "03", title: "Development",            desc: "Agile-driven coding: book management, attendance monitoring, online catalog, QR generation, and admin dashboard." },
  { num: "04", title: "Testing & Debugging",    desc: "Thorough QA for QR scanning accuracy, module integration, and system reliability across all features." },
  { num: "05", title: "Evaluation",             desc: "System assessed by library staff and student respondents using ISO 25010 standards for usability and accuracy." },
  { num: "06", title: "Deployment",             desc: "Live deployment at PSU Sto. Tomas Campus library, with ongoing monitoring and maintenance support." },
];

// ─── Team ──────────────────────────────────────────────────────────────────────
export const TEAM = [
  { name: "Xandru C. Bondoc",          contact: "09610974315" },
  { name: "Rusty A. Pineda",           contact: "09917101289" },
  { name: "Edzel John R. Lacap",       contact: "09318431295" },
  { name: "Prince Christian S. Mata",  contact: "09971544550" },
  { name: "Jerry Yan A. Balagtas",     contact: "09924066896" },
];

// ─── Scope Tags ────────────────────────────────────────────────────────────────
export const SCOPE_TAGS = [
  { label: "Web Platform",  accent: MAROON },
  { label: "Android App",   accent: GOLD   },
  { label: "iOS App",       accent: MAROON },
  { label: "Admin Portal",  accent: GOLD   },
  { label: "QR Generator",  accent: MAROON },
  { label: "Live Reports",  accent: GOLD   },
];

// ─── Stats ─────────────────────────────────────────────────────────────────────
export const STAT_TARGETS = [
  { target: 5000, suffix: "+", label: "Books in Catalog"  },
  { target: 1200, suffix: "+", label: "Registered Users"  },
  { target: 98,   suffix: "%", label: "Scan Accuracy"     },
  { target: 1,    suffix: "",  label: "University Campus" },
];