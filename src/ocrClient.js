// src/ocrClient.js
// ─── Tesseract.js OCR Client — LIBRASCAN Library Management System ────────────
// Loads Tesseract.js from CDN (no Vite import issues).
// NO API KEY needed. NO signup. Completely FREE.
//
// REQUIRED: Add this ONE line inside the <head> of your index.html:
//   <script src="https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"></script>
// ─────────────────────────────────────────────────────────────────────────────

// ─── Wait for Tesseract to load from CDN ─────────────────────────────────────
function getTesseract() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    let tries = 0;
    const interval = setInterval(() => {
      if (window.Tesseract) {
        clearInterval(interval);
        resolve(window.Tesseract);
      } else if (++tries > 50) {
        clearInterval(interval);
        reject(new Error(
          'Tesseract.js failed to load. Add this to your index.html <head>:\n' +
          '<script src="https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"></script>'
        ));
      }
    }, 200);
  });
}

// ─── Clean OCR noise from a line of text ─────────────────────────────────────
// Tesseract often injects stray single characters (1, E, ], 4, 3, i, |, }) at
// the start or end of lines when it misreads page numbers, bullets, or margins.
function cleanLine(line) {
  return line
    // Remove stray leading noise: digits, lone letters, symbols before real word
    .replace(/^[\d\[\]|}{\\\/]+\s+/, '')
    // Remove lone single uppercase/lowercase letter at line start (e.g. "E The art...")
    .replace(/^[A-Za-z]\s+(?=[A-Z])/, '')
    // Remove stray trailing single chars: lone letter or digit after a space
    .replace(/\s+[A-Za-z\d|}\]\\\/]{1,2}$/, '')
    // Remove inline noise: single isolated letters between spaces that aren't "a", "I", "i"
    .replace(/(?<!\w)\b([B-HJ-Z]|[b-hj-z])\b(?!\w)/g, (m) => ['a','I','i'].includes(m) ? m : '')
    // Collapse multiple spaces left by removals
    .replace(/\s{2,}/g, ' ')
    // Remove hyphenation at line breaks (word- \n word → wordword)
    .replace(/-\s*$/, '')
    .trim();
}

// ─── Structure raw OCR text into { heading, paragraphs, keywords } ────────────
function structureOcrText(rawText) {
  if (!rawText?.trim()) return { heading: '', paragraphs: [], keywords: [] };

  // Normalize + split into lines, clean each line, drop empties and very short noise
  const rawLines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => cleanLine(l.trim()))
    .filter(l => l.length > 2);   // drop 1–2 char OCR noise lines

  if (rawLines.length === 0) return { heading: '', paragraphs: [], keywords: [] };

  // ── 1. Detect heading anywhere in first 3 lines ───────────────────────────
  // Tesseract sometimes puts junk before the real heading
  const HEADING_RE = /^(abstract|preface|foreword|introduction|summary|executive\s+summary|acknowledgements?|dedication|prologue|overview)$/i;
  let heading  = '';
  let startIdx = 0;

  for (let i = 0; i < Math.min(3, rawLines.length); i++) {
    if (HEADING_RE.test(rawLines[i].trim())) {
      heading  = rawLines[i].trim().toUpperCase();
      startIdx = i + 1;
      break;
    }
  }

  // ── 2. Find "Special Features", "Keywords:", sub-headings to split sections ─
  // Sub-headings are short lines (≤ 6 words) that are all title-cased or ALL CAPS
  // and appear after at least 2 body lines
  const KEYWORD_RE   = /^key\s*words?\s*[:\-]/i;
  const SUBHEAD_RE   = /^[A-Z][a-zA-Z\s]{2,40}[:\.]?$/;

  let keywords  = [];
  let bodyLines = rawLines.slice(startIdx);

  // Extract keywords line
  const kwIdx = bodyLines.findIndex(l => KEYWORD_RE.test(l));
  if (kwIdx !== -1) {
    const kwLine = bodyLines[kwIdx].replace(/^key\s*words?\s*[:\-]\s*/i, '');
    keywords  = kwLine.split(/[,;]/).map(k => k.trim()).filter(Boolean);
    bodyLines = bodyLines.filter((_, i) => i !== kwIdx);
  }

  // ── 3. Re-join hyphenated words split across OCR lines ─────────────────────
  const joined = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (line.endsWith('-') && i + 1 < bodyLines.length) {
      // Merge with next line (remove hyphen)
      joined.push(line.slice(0, -1) + bodyLines[i + 1]);
      i++; // skip next line — already merged
    } else {
      joined.push(line);
    }
  }

  // ── 4. Group joined lines into paragraphs ─────────────────────────────────
  // A new paragraph begins when:
  //   a) current line ends a sentence (.!?) AND next line starts with uppercase
  //   b) current line looks like a sub-heading (short, title-cased)
  //   c) we've accumulated ≥ 6 lines
  const paragraphs = [];
  let   current    = [];
  let   isSubhead  = false;

  const flush = () => {
    if (current.length > 0) {
      paragraphs.push({ text: current.join(' '), isSubhead });
      current   = [];
      isSubhead = false;
    }
  };

  for (let i = 0; i < joined.length; i++) {
    const line     = joined[i];
    const next     = joined[i + 1] || '';
    const wordCount = line.split(/\s+/).length;

    // Detect sub-heading: short line, title-case/caps, ends sentence or has colon
    const looksLikeSubhead = (
      wordCount <= 5 &&
      SUBHEAD_RE.test(line) &&
      current.length === 0   // only treat as subhead if starting fresh
    );

    if (looksLikeSubhead && i > 0) {
      flush();
      isSubhead = true;
    }

    current.push(line);

    const sentenceEnd  = /[.!?]["']?$/.test(line);
    const nextCapStart = /^[A-Z"'([]/.test(next);
    const longEnough   = current.length >= 6;

    if (!looksLikeSubhead && (( sentenceEnd && nextCapStart) || longEnough)) {
      flush();
    }
  }
  flush();

  // Convert to final format — sub-headings become their own "paragraph" with a flag
  const finalParagraphs = paragraphs.map(p => p.text);
  const subheadings     = paragraphs
    .filter(p => p.isSubhead)
    .map(p => p.text);

  return { heading, paragraphs: finalParagraphs, keywords, subheadings };
}

// ─── Main export: extractAbstractText ────────────────────────────────────────
// @param  {File}     file       — Image file (JPG / PNG / WEBP / BMP)
// @param  {Function} onProgress — Optional: (pct: number, status: string) => void
// @returns {Promise<{ heading: string, paragraphs: string[], keywords: string[], subheadings: string[] }>}
//
export async function extractAbstractText(file, onProgress) {
  const Tesseract = await getTesseract();

  const result = await Tesseract.recognize(file, 'eng', {
    logger: ({ status, progress }) => {
      if (onProgress) {
        const pct = Math.round((progress || 0) * 100);
        onProgress(pct, status);
      }
    },
  });

  const rawText = result?.data?.text || '';

  if (!rawText.trim()) {
    return {
      heading:     '',
      paragraphs:  ['No text could be read from this image. Try a clearer, higher-resolution photo.'],
      keywords:    [],
      subheadings: [],
    };
  }

  return structureOcrText(rawText);
}