import { parseJsonTranscript, parseCueTranscript } from "./tokenization";

export interface ParsedBookFile {
  title: string;
  author: string;
  text: string;
  format: string;
}

async function getJSZip() {
  const mod = await import("jszip");
  return mod.default || mod;
}

async function getPdfJs() {
  const [pdfjsLib, workerMod] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ]);
  const workerUrl = (workerMod.default || workerMod) as string;
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  return pdfjsLib;
}

/**
 * Clean and format a title derived from a filename.
 */
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean HTML/XML document into readable plain text with paragraph breaks.
 */
function extractTextFromHtml(html: string): string {
  // First strip scripts, styles, noscript completely
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanHtml, "text/html");

      const unwanted = doc.querySelectorAll("script, style, noscript, nav, header, footer, svg, form");
      unwanted.forEach((el) => el.remove());

      const body = doc.body || doc.documentElement;
      if (body) {
        const blocks: string[] = [];
        const blockTags = new Set([
          "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
          "LI", "BLOCKQUOTE", "SECTION", "ARTICLE", "TR", "BR", "HR"
        ]);

        function walk(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent || "";
            if (txt.trim()) {
              blocks.push(txt);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const isBlock = blockTags.has(el.tagName);
            if (isBlock && blocks.length > 0 && !blocks[blocks.length - 1].endsWith("\n")) {
              blocks.push("\n");
            }
            for (let child = el.firstChild; child; child = child.nextSibling) {
              walk(child);
            }
            if (isBlock && blocks.length > 0 && !blocks[blocks.length - 1].endsWith("\n\n")) {
              blocks.push("\n\n");
            }
          }
        }

        walk(body);

        const result = blocks
          .join("")
          .replace(/[ \t]+/g, " ")
          .replace(/\n\s*\n\s*\n+/g, "\n\n")
          .trim();
        if (result) return result;
      }
    } catch {
      // Fall through to regex strip
    }
  }

  // Regex fallback
  return cleanHtml
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Parse an EPUB file into title, author, and readable text.
 */
async function parseEpub(file: File): Promise<ParsedBookFile> {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(file);

  // 1. Read META-INF/container.xml to find OPF path
  let opfPath = "";
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  if (containerXml) {
    const match = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i);
    if (match) {
      opfPath = match[1];
    }
  }

  // Fallback: look for any .opf file in the archive
  if (!opfPath) {
    const opfFile = Object.keys(zip.files).find((f) => f.endsWith(".opf"));
    if (opfFile) opfPath = opfFile;
  }

  let title = titleFromFilename(file.name);
  let author = "";
  const chapterHrefs: string[] = [];

  if (opfPath) {
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
    const opfContent = await zip.file(opfPath)?.async("text");
    if (opfContent) {
      if (typeof DOMParser !== "undefined") {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(opfContent, "application/xml");

          const titleEl = doc.querySelector("title, dc\\:title");
          if (titleEl?.textContent?.trim()) {
            title = titleEl.textContent.trim();
          }

          const authorEl = doc.querySelector("creator, dc\\:creator");
          if (authorEl?.textContent?.trim()) {
            author = authorEl.textContent.trim();
          }

          // Manifest items
          const manifestMap = new Map<string, string>();
          doc.querySelectorAll("manifest > item").forEach((item) => {
            const id = item.getAttribute("id");
            const href = item.getAttribute("href");
            if (id && href) {
              manifestMap.set(id, href);
            }
          });

          // Spine order
          doc.querySelectorAll("spine > itemref").forEach((itemref) => {
            const idref = itemref.getAttribute("idref");
            if (idref && manifestMap.has(idref)) {
              const rawHref = manifestMap.get(idref)!;
              const cleanHref = decodeURIComponent(rawHref.split("#")[0]);
              const fullPath = opfDir + cleanHref;
              chapterHrefs.push(fullPath);
            }
          });
        } catch {
          // Fall through to regex
        }
      }

      // Regex fallbacks for OPF metadata if needed
      if (title === titleFromFilename(file.name)) {
        const tMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (tMatch) title = tMatch[1].trim();
      }
      if (!author) {
        const aMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
        if (aMatch) author = aMatch[1].trim();
      }
      if (!chapterHrefs.length) {
        const manifestRegex = /<item\b[^>]*\bid=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
        const manifestMap = new Map<string, string>();
        let m: RegExpExecArray | null;
        while ((m = manifestRegex.exec(opfContent)) !== null) {
          manifestMap.set(m[1], m[2]);
        }
        const spineRegex = /<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi;
        while ((m = spineRegex.exec(opfContent)) !== null) {
          const href = manifestMap.get(m[1]);
          if (href) {
            const cleanHref = decodeURIComponent(href.split("#")[0]);
            chapterHrefs.push(opfDir + cleanHref);
          }
        }
      }
    }
  }

  // If no spine was parsed, gather all HTML/XHTML files sorted
  if (!chapterHrefs.length) {
    Object.keys(zip.files)
      .filter((name) => /\.(?:xhtml|html|htm)$/i.test(name) && !/toc|nav/i.test(name))
      .sort()
      .forEach((name) => chapterHrefs.push(name));
  }

  const chapterTexts: string[] = [];
  for (const href of chapterHrefs) {
    const zipEntry =
      zip.file(href) ||
      zip.file(href.replace(/^\.\//, "")) ||
      zip.file(href.split("/").pop() || "");
    if (zipEntry) {
      const rawHtml = await zipEntry.async("text");
      const text = extractTextFromHtml(rawHtml);
      if (text.length > 20) {
        chapterTexts.push(text);
      }
    }
  }

  return {
    title,
    author,
    text: chapterTexts.join("\n\n"),
    format: "EPUB"
  };
}

/**
 * Parse a PDF file into title, author, and readable text.
 */
async function parsePdf(file: File): Promise<ParsedBookFile> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true
  });

  const pdf = await loadingTask.promise;
  let title = titleFromFilename(file.name);
  let author = "";

  try {
    const meta = await pdf.getMetadata();
    const info = (meta?.info as Record<string, unknown>) || {};
    if (typeof info.Title === "string" && info.Title.trim()) {
      title = info.Title.trim();
    }
    if (typeof info.Author === "string" && info.Author.trim()) {
      author = info.Author.trim();
    }
  } catch {
    // Metadata is optional
  }

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string; hasEOL?: boolean }>;

    let pageStr = "";
    for (const item of items) {
      if (typeof item.str === "string") {
        pageStr += item.str;
        if (item.hasEOL) {
          pageStr += "\n";
        } else if (!item.str.endsWith(" ")) {
          pageStr += " ";
        }
      }
    }

    const trimmed = pageStr.trim();
    if (trimmed) {
      pageTexts.push(trimmed);
    }
  }

  return {
    title,
    author,
    text: pageTexts.join("\n\n"),
    format: "PDF"
  };
}

/**
 * Parse FictionBook 2.0 (.fb2) file.
 */
function parseFb2(xmlText: string, filename: string): ParsedBookFile {
  let title = titleFromFilename(filename);
  let author = "";
  const paragraphs: string[] = [];

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "application/xml");

      const docTitle = doc.querySelector("book-title")?.textContent?.trim();
      if (docTitle) title = docTitle;

      const authorParts = [
        doc.querySelector("title-info > author > first-name")?.textContent?.trim(),
        doc.querySelector("title-info > author > last-name")?.textContent?.trim()
      ].filter(Boolean);
      if (authorParts.length) author = authorParts.join(" ");

      doc.querySelectorAll("body p").forEach((p) => {
        const t = p.textContent?.trim();
        if (t) paragraphs.push(t);
      });
    } catch {
      // Fall through to regex
    }
  }

  if (!paragraphs.length) {
    const titleMatch = xmlText.match(/<book-title[^>]*>([^<]+)<\/book-title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const firstName = xmlText.match(/<first-name[^>]*>([^<]+)<\/first-name>/i)?.[1]?.trim();
    const lastName = xmlText.match(/<last-name[^>]*>([^<]+)<\/last-name>/i)?.[1]?.trim();
    author = [firstName, lastName].filter(Boolean).join(" ");

    const pMatches = xmlText.matchAll(/<p[^>]*>([^<]+)<\/p>/gi);
    for (const m of pMatches) {
      if (m[1].trim()) paragraphs.push(m[1].trim());
    }
  }

  return {
    title,
    author,
    text: paragraphs.join("\n\n"),
    format: "FB2"
  };
}

/**
 * Parse Rich Text Format (.rtf) into clean text.
 */
function parseRtf(rtf: string, filename: string): ParsedBookFile {
  // Strip font, color, and stylesheet tables
  let clean = rtf.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^}]*\}/gi, "");

  // Convert line breaks and paragraph breaks
  clean = clean.replace(/\\par\b/gi, "\n\n");
  clean = clean.replace(/\\line\b/gi, "\n");
  clean = clean.replace(/\\tab\b/gi, "\t");

  // Handle hex characters \'xx
  clean = clean.replace(/\\'[0-9a-f]{2}/gi, (match) => {
    try {
      const hex = match.slice(2);
      const code = parseInt(hex, 16);
      return String.fromCharCode(code);
    } catch {
      return "";
    }
  });

  // Handle Unicode escapes \uNNNN?
  clean = clean.replace(/\\u(-?\d+)\??/g, (_, codeStr) => {
    try {
      let code = parseInt(codeStr, 10);
      if (code < 0) code += 65536;
      return String.fromCharCode(code);
    } catch {
      return "";
    }
  });

  // Remove remaining groups and backslash control words
  clean = clean.replace(/\{[^{}]*\}/g, "");
  clean = clean.replace(/\\[a-z]+-?\d*\s?/gi, "");
  clean = clean.replace(/[{}]+/g, "");

  return {
    title: titleFromFilename(filename),
    author: "",
    text: clean.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim(),
    format: "RTF"
  };
}

/**
 * Clean markdown formatting while preserving text structure.
 */
function cleanMarkdown(md: string, filename: string): ParsedBookFile {
  let title = titleFromFilename(filename);
  let author = "";

  // Check frontmatter
  const frontmatterMatch = md.match(/^---\s*([\s\S]*?)\s*---/);
  let textBody = md;
  if (frontmatterMatch) {
    const meta = frontmatterMatch[1];
    const titleM = meta.match(/^title:\s*["']?(.*?)["']?$/m);
    const authorM = meta.match(/^author:\s*["']?(.*?)["']?$/m);
    if (titleM?.[1]) title = titleM[1].trim();
    if (authorM?.[1]) author = authorM[1].trim();
    textBody = md.slice(frontmatterMatch[0].length);
  }

  // Check first heading if title is still just the filename
  const headingMatch = textBody.match(/^#\s+(.+)$/m);
  if (headingMatch && title === titleFromFilename(filename)) {
    title = headingMatch[1].trim();
  }

  // Strip markdown formatting syntax
  let cleaned = textBody
    .replace(/^#+\s+/gm, "") // Headings
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links -> anchor text
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // Bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // Italics
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/^>\s+/gm, "") // Blockquotes
    .replace(/^[-*+]\s+/gm, "") // Bullet points
    .replace(/^\d+\.\s+/gm, "") // Numbered lists
    .trim();

  return {
    title,
    author,
    text: cleaned,
    format: "Markdown"
  };
}

/**
 * Main parser function: handles any supported document format and extracts
 * title, author, and readable Spanish text.
 */
export async function parseUploadedFile(file: File): Promise<ParsedBookFile> {
  const filename = file.name;
  const lower = filename.toLowerCase();

  // 1. EPUB
  if (lower.endsWith(".epub") || file.type === "application/epub+zip") {
    return parseEpub(file);
  }

  // 2. PDF
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    return parsePdf(file);
  }

  // 3. HTML / XHTML
  if (
    lower.endsWith(".html") ||
    lower.endsWith(".htm") ||
    lower.endsWith(".xhtml") ||
    file.type === "text/html" ||
    file.type === "application/xhtml+xml"
  ) {
    const raw = await file.text();
    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const authorMatch = raw.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
    return {
      title: titleMatch?.[1]?.trim() || titleFromFilename(filename),
      author: authorMatch?.[1]?.trim() || "",
      text: extractTextFromHtml(raw),
      format: "HTML"
    };
  }

  // 4. FictionBook 2.0 (.fb2)
  if (lower.endsWith(".fb2") || lower.endsWith(".fb2.zip")) {
    if (lower.endsWith(".zip")) {
      const JSZip = await getJSZip();
      const zip = await JSZip.loadAsync(file);
      const fb2Entry = Object.keys(zip.files).find((f) => f.endsWith(".fb2"));
      if (fb2Entry) {
        const xml = await zip.file(fb2Entry)!.async("text");
        return parseFb2(xml, filename);
      }
    }
    const raw = await file.text();
    return parseFb2(raw, filename);
  }

  // 5. RTF
  if (lower.endsWith(".rtf") || file.type === "application/rtf" || file.type === "text/rtf") {
    const raw = await file.text();
    return parseRtf(raw, filename);
  }

  // 6. JSON / Subtitle formats (.json, .vtt, .srt)
  if (lower.endsWith(".json")) {
    const raw = await file.text();
    try {
      const parsedTokens = parseJsonTranscript(raw);
      if (parsedTokens.length > 0) {
        const joined = parsedTokens.map((w) => `${w.prefix || ""}${w.text}${w.separator || " "}`).join("");
        return {
          title: titleFromFilename(filename),
          author: "",
          text: joined.trim(),
          format: "JSON Transcript"
        };
      }
    } catch {
      // Fall through to plain text
    }
  }

  if (lower.endsWith(".vtt") || lower.endsWith(".srt")) {
    const raw = await file.text();
    try {
      const parsedTokens = parseCueTranscript(raw);
      if (parsedTokens.length > 0) {
        const joined = parsedTokens.map((w) => `${w.prefix || ""}${w.text}${w.separator || " "}`).join("");
        return {
          title: titleFromFilename(filename),
          author: "",
          text: joined.trim(),
          format: "Subtitles"
        };
      }
    } catch {
      // Fall through to plain text
    }
  }

  // 7. Markdown
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    const raw = await file.text();
    return cleanMarkdown(raw, filename);
  }

  // 8. Plain Text (.txt, default)
  const raw = await file.text();
  return {
    title: titleFromFilename(filename),
    author: "",
    text: raw.trim(),
    format: "Plain Text"
  };
}
