/**
 * UI chrome strings (window titles, buttons, taskbar, dialogs).
 * CV content itself lives in `src/data/cv.ts`.
 */

import type { Localized } from "../data/cv";

export const UI = {
  // Window / icon titles
  personalInfo: { en: "Personal Info", el: "Προσωπικά Στοιχεία" },
  about: { en: "About Me", el: "Σχετικά με Εμένα" },
  education: { en: "Education", el: "Εκπαίδευση" },
  skills: { en: "Skills", el: "Δεξιότητες" },
  experience: { en: "Experience", el: "Εμπειρία" },
  projects: { en: "Projects", el: "Projects" },
  activities: { en: "Activities", el: "Δραστηριότητες" },
  contact: { en: "Contact", el: "Επικοινωνία" },
  portfolio: { en: "MSc Portfolio", el: "Πορτφόλιο MSc" },
  resume: { en: "Resume (PDF)", el: "Βιογραφικό (PDF)" },
  settings: { en: "Display Properties", el: "Ιδιότητες Εμφάνισης" },
  admin: { en: "Update CV", el: "Ενημέρωση CV" },

  // Admin window
  adminIntro: {
    en: "Upload your CV as a PDF. It is read by AI and published to the live site in both languages.",
    el: "Ανέβασε το βιογραφικό σου σε PDF. Διαβάζεται από AI και δημοσιεύεται στο live site και στις δύο γλώσσες.",
  },
  adminPassword: { en: "Password", el: "Κωδικός" },
  adminFile: { en: "Your CV", el: "Το βιογραφικό σου" },
  adminEitherLanguage: {
    en: "Greek or English — either one. The site is published in both: your document supplies one language and the other is translated from it.",
    el: "Ελληνικά ή αγγλικά — ό,τι έχεις. Το site βγαίνει και στις δύο γλώσσες: το έγγραφό σου δίνει τη μία και η άλλη μεταφράζεται από αυτό.",
  },
  adminSubmit: { en: "Upload and publish", el: "Ανέβασμα και δημοσίευση" },
  adminWorking: { en: "Working…", el: "Επεξεργασία…" },
  adminPatience: {
    en: "Reading the document and writing both languages. This takes 40–90 seconds — keep the window open.",
    el: "Διαβάζω το έγγραφο και γράφω και τις δύο γλώσσες. Παίρνει 40–90 δευτερόλεπτα — μην κλείσεις το παράθυρο.",
  },
  adminDone: { en: "Published.", el: "Δημοσιεύτηκε." },
  adminFailed: { en: "Failed", el: "Απέτυχε" },
  adminPdfSaved: { en: "PDF downloads updated", el: "Ενημερώθηκαν τα PDF προς λήψη" },
  adminSiteLangs: { en: "Site languages", el: "Γλώσσες του site" },
  adminNoTranslation: {
    en: "The translation step returned nothing, so both languages currently show the same text. Upload again — this is usually the free tier being busy.",
    el: "Το βήμα της μετάφρασης δεν επέστρεψε τίποτα, οπότε και οι δύο γλώσσες δείχνουν προς το παρόν το ίδιο κείμενο. Ξαναδοκίμασε — συνήθως φταίει η συμφόρηση στο δωρεάν επίπεδο.",
  },
  adminRedeploy: {
    en: "The site rebuilds automatically. Refresh in about a minute to see the change.",
    el: "Το site ξαναχτίζεται αυτόματα. Κάνε ανανέωση σε περίπου ένα λεπτό για να δεις την αλλαγή.",
  },
  adminTooLarge: {
    en: "The file is larger than 3 MB. Compress the PDF and try again.",
    el: "Το αρχείο ξεπερνά τα 3 MB. Συμπίεσε το PDF και δοκίμασε ξανά.",
  },
  adminNoBackend: {
    en: "The import service is not reachable here. It only runs on the Vercel deployment.",
    el: "Η υπηρεσία εισαγωγής δεν είναι διαθέσιμη εδώ. Λειτουργεί μόνο στο deployment του Vercel.",
  },
  adminShowPassword: { en: "Show password", el: "Εμφάνιση κωδικού" },
  adminHidePassword: { en: "Hide password", el: "Απόκρυψη κωδικού" },
  adminFormats: {
    en: "PDF only, up to 15 pages and 3 MB. Word files lose their structure when converted, and the PDF you upload is also the one visitors download.",
    el: "Μόνο PDF, έως 15 σελίδες και 3 MB. Τα αρχεία Word χάνουν τη δομή τους στη μετατροπή, και το PDF που ανεβάζεις είναι αυτό που κατεβάζουν οι επισκέπτες.",
  },

  // Taskbar / start menu
  start: { en: "start", el: "έναρξη" },
  allWindows: { en: "Open windows", el: "Ανοιχτά παράθυρα" },
  closeAll: { en: "Close all windows", el: "Κλείσιμο όλων" },
  language: { en: "Language", el: "Γλώσσα" },
  theme: { en: "Theme", el: "Θέμα" },

  // Window controls (accessible labels)
  minimize: { en: "Minimize", el: "Ελαχιστοποίηση" },
  maximize: { en: "Maximize", el: "Μεγιστοποίηση" },
  restore: { en: "Restore", el: "Επαναφορά" },
  close: { en: "Close", el: "Κλείσιμο" },

  // Boot screen
  booting: { en: "Starting up…", el: "Εκκίνηση…" },
  welcome: { en: "welcome", el: "καλώς ήρθατε" },
  clickToEnter: { en: "Click to log on", el: "Κάντε κλικ για είσοδο" },

  // Misc
  certifications: { en: "Certifications", el: "Πιστοποιήσεις" },
  summary: { en: "Summary", el: "Περίληψη" },
  downloadCvEn: { en: "Open CV — English (PDF)", el: "Άνοιγμα CV — Αγγλικά (PDF)" },
  downloadCvEl: { en: "Open CV — Greek (PDF)", el: "Άνοιγμα Βιογραφικού — Ελληνικά (PDF)" },
  openCvHint: {
    en: "Opens the full CV in a new tab.",
    el: "Ανοίγει το πλήρες βιογραφικό σε νέα καρτέλα.",
  },
  resumeLangNote: {
    en: "The CV is available in English and Greek. The button gives you the version matching the interface language — switch the language to get the other one.",
    el: "Το βιογραφικό είναι διαθέσιμο στα Ελληνικά και στα Αγγλικά. Το κουμπί σού δίνει την έκδοση που ταιριάζει με τη γλώσσα του site — άλλαξε γλώσσα για την άλλη έκδοση.",
  },
  portfolioTitle: { en: "Portfolio", el: "Πορτφόλιο" },
  copyright: {
    en: "Developed by Ioannis Kalaitzidis — All rights reserved",
    el: "Αναπτύχθηκε από τον Ιωάννη Καλαϊτζίδη — Με επιφύλαξη παντός δικαιώματος",
  },
  desktopHint: {
    en: "Double-click an icon to open a window.",
    el: "Διπλό κλικ σε ένα εικονίδιο για να ανοίξει ένα παράθυρο.",
  },
  tipTitle: { en: "Tip", el: "Συμβουλή" },
  portfolioBlurb: {
    en: "A separate site collecting the coursework, labs and write-ups from my MSc in Cybersecurity and Artificial Intelligence.",
    el: "Ξεχωριστό site που συγκεντρώνει τις εργασίες, τα εργαστήρια και τις αναφορές από το μεταπτυχιακό μου στην Κυβερνοασφάλεια και την Τεχνητή Νοημοσύνη.",
  },
  openPortfolio: { en: "Open portfolio", el: "Άνοιγμα πορτφόλιο" },
  lastUpdated: { en: "CV last updated", el: "Τελευταία ενημέρωση βιογραφικού" },
  /** Browser-tab title: "<name> — Digital CV". */
  siteTitleSuffix: { en: "Digital CV", el: "Ψηφιακό Βιογραφικό" },
} satisfies Record<string, Localized>;

export type UiKey = keyof typeof UI;
