
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


function cleanLine(line) {
  return line

    .replace(/^[\d\[\]|}{\\\/]+\s+/, '')

    .replace(/^[A-Za-z]\s+(?=[A-Z])/, '')

    .replace(/\s+[A-Za-z\d|}\]\\\/]{1,2}$/, '')

    .replace(/(?<!\w)\b([B-HJ-Z]|[b-hj-z])\b(?!\w)/g, (m) => ['a','I','i'].includes(m) ? m : '')

    .replace(/\s{2,}/g, ' ')

    .replace(/-\s*$/, '')
    .trim();
}


function structureOcrText(rawText) {
  if (!rawText?.trim()) return { heading: '', paragraphs: [], keywords: [] };


  const rawLines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => cleanLine(l.trim()))
    .filter(l => l.length > 2);   
  if (rawLines.length === 0) return { heading: '', paragraphs: [], keywords: [] };


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


  const KEYWORD_RE   = /^key\s*words?\s*[:\-]/i;
  const SUBHEAD_RE   = /^[A-Z][a-zA-Z\s]{2,40}[:\.]?$/;

  let keywords  = [];
  let bodyLines = rawLines.slice(startIdx);


  const kwIdx = bodyLines.findIndex(l => KEYWORD_RE.test(l));
  if (kwIdx !== -1) {
    const kwLine = bodyLines[kwIdx].replace(/^key\s*words?\s*[:\-]\s*/i, '');
    keywords  = kwLine.split(/[,;]/).map(k => k.trim()).filter(Boolean);
    bodyLines = bodyLines.filter((_, i) => i !== kwIdx);
  }


  const joined = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (line.endsWith('-') && i + 1 < bodyLines.length) {
     
      joined.push(line.slice(0, -1) + bodyLines[i + 1]);
      i++; 
    } else {
      joined.push(line);
    }
  }


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

 
    const looksLikeSubhead = (
      wordCount <= 5 &&
      SUBHEAD_RE.test(line) &&
      current.length === 0   
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


  const finalParagraphs = paragraphs.map(p => p.text);
  const subheadings     = paragraphs
    .filter(p => p.isSubhead)
    .map(p => p.text);

  return { heading, paragraphs: finalParagraphs, keywords, subheadings };
}


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