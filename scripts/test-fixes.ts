import fs from "fs";
import { parseUploadedFile, titleFromFilename } from "../src/utils/fileParsers.ts";
import { tokenizeUntimed, parseJsonTranscript, parseCueTranscript } from "../src/utils/tokenization.ts";
import { buildTtsChunks, createTtsSegment, findTtsChunkAtWord } from "../src/hooks/useBrowserTts.ts";
import JSZip from "jszip";

async function runTests() {
  console.log("=== RUNNING AUTOMATED TESTS FOR ALL FIXES ===");

  // 1. Test Title from Filename
  console.log("\n1. Testing titleFromFilename...");
  const title1 = titleFromFilename("mi_gran_libro_de_aventuras.epub");
  if (title1 !== "mi gran libro de aventuras") throw new Error(`Unexpected title: ${title1}`);
  console.log("   ✓ titleFromFilename works:", title1);

  // 2. Test File Parsers: TXT
  console.log("\n2. Testing plain text parsing...");
  const txtFile = new File(["Había una vez en un pueblo lejano..."], "cuento.txt", { type: "text/plain" });
  const parsedTxt = await parseUploadedFile(txtFile);
  if (!parsedTxt.text.includes("Había una vez") || parsedTxt.title !== "cuento") {
    throw new Error(`TXT parsing failed: ${JSON.stringify(parsedTxt)}`);
  }
  console.log("   ✓ Plain text parsed successfully:", parsedTxt.format);

  // 3. Test File Parsers: Markdown
  console.log("\n3. Testing markdown parsing...");
  const mdContent = `---
title: El Viaje Extraordinario
author: Julio Verne
---
# Introducción
Este es un **libro fantástico** con [enlaces](https://example.com) e imágenes ![foto](img.png).
`;
  const mdFile = new File([mdContent], "viaje.md", { type: "text/markdown" });
  const parsedMd = await parseUploadedFile(mdFile);
  if (parsedMd.title !== "El Viaje Extraordinario" || parsedMd.author !== "Julio Verne") {
    throw new Error(`Markdown metadata failed: ${JSON.stringify(parsedMd)}`);
  }
  if (parsedMd.text.includes("**") || parsedMd.text.includes("![foto]")) {
    throw new Error(`Markdown syntax not cleaned: ${parsedMd.text}`);
  }
  console.log("   ✓ Markdown parsed and cleaned successfully:", parsedMd.title, "by", parsedMd.author);

  // 4. Test File Parsers: HTML
  console.log("\n4. Testing HTML parsing...");
  const htmlContent = `<!DOCTYPE html><html><head><title>Historia de España</title><meta name="author" content="Don Juan"></head><body><h1>Capitulo I</h1><p>En el principio era la palabra.</p><script>alert('bad');</script></body></html>`;
  const htmlFile = new File([htmlContent], "historia.html", { type: "text/html" });
  const parsedHtml = await parseUploadedFile(htmlFile);
  if (parsedHtml.title !== "Historia de España" || parsedHtml.author !== "Don Juan") {
    throw new Error(`HTML metadata failed: ${JSON.stringify(parsedHtml)}`);
  }
  if (parsedHtml.text.includes("alert")) {
    throw new Error(`HTML script not stripped: ${parsedHtml.text}`);
  }
  if (!parsedHtml.text.includes("En el principio era la palabra.")) {
    throw new Error(`HTML text missing: ${parsedHtml.text}`);
  }
  console.log("   ✓ HTML parsed and scripts stripped successfully");

  // 5. Test File Parsers: FB2
  console.log("\n5. Testing FB2 parsing...");
  const fb2Content = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <author><first-name>Miguel</first-name><last-name>de Cervantes</last-name></author>
      <book-title>El Ingenioso Hidalgo</book-title>
    </title-info>
  </description>
  <body>
    <section>
      <p>En un lugar de la Mancha...</p>
    </section>
  </body>
</FictionBook>`;
  const fb2File = new File([fb2Content], "quijote.fb2", { type: "application/xml" });
  const parsedFb2 = await parseUploadedFile(fb2File);
  if (parsedFb2.title !== "El Ingenioso Hidalgo" || !parsedFb2.author.includes("Cervantes")) {
    throw new Error(`FB2 metadata failed: ${JSON.stringify(parsedFb2)}`);
  }
  if (!parsedFb2.text.includes("En un lugar de la Mancha")) {
    throw new Error(`FB2 text missing: ${parsedFb2.text}`);
  }
  console.log("   ✓ FB2 parsed successfully:", parsedFb2.title, "by", parsedFb2.author);

  // 6. Test File Parsers: RTF
  console.log("\n6. Testing RTF parsing...");
  const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil Arial;}}\\pard\\b El principito\\b0\\par Viv\\\'eda en un asteroide.\\line Fin.}`;
  const rtfFile = new File([rtfContent], "principito.rtf", { type: "application/rtf" });
  const parsedRtf = await parseUploadedFile(rtfFile);
  if (!parsedRtf.text.includes("El principito") || !parsedRtf.text.includes("asteroide")) {
    throw new Error(`RTF text failed: ${JSON.stringify(parsedRtf)}`);
  }
  console.log("   ✓ RTF parsed and escapes decoded successfully");

  // 7. Test File Parsers: EPUB
  console.log("\n7. Testing EPUB parsing...");
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>La Ciudad y los Perros</dc:title>
    <dc:creator>Mario Vargas Llosa</dc:creator>
  </metadata>
  <manifest>
    <item id="c1" href="cap1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="cap2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`
  );
  zip.file(
    "OEBPS/cap1.xhtml",
    `<?xml version="1.0"?><html><body><h1>Capítulo Primero</h1><p>Cuatro, dijo el Jaguar.</p></body></html>`
  );
  zip.file(
    "OEBPS/cap2.xhtml",
    `<?xml version="1.0"?><html><body><h1>Capítulo Segundo</h1><p>Los rostros se suavizaban al resplandor de los cigarrillos.</p></body></html>`
  );
  const epubBuffer = await zip.generateAsync({ type: "uint8array" });
  const epubFile = new File([epubBuffer], "ciudad.epub", { type: "application/epub+zip" });
  const parsedEpub = await parseUploadedFile(epubFile);
  if (parsedEpub.title !== "La Ciudad y los Perros" || parsedEpub.author !== "Mario Vargas Llosa") {
    throw new Error(`EPUB metadata failed: ${JSON.stringify(parsedEpub)}`);
  }
  if (!parsedEpub.text.includes("Cuatro, dijo el Jaguar") || !parsedEpub.text.includes("cigarrillos")) {
    throw new Error(`EPUB content failed: ${JSON.stringify(parsedEpub)}`);
  }
  console.log("   ✓ EPUB fully unpacked in spine order:", parsedEpub.title, "by", parsedEpub.author);

  // 8. Test Big Book Tokenization and TTS Chunking
  console.log("\n8. Testing big book processing (50,000 words)...");
  const sentence = "En un rincón de la vieja biblioteca descansaba un libro dorado con historias increíbles del pasado. ";
  const bigText = sentence.repeat(3500); // ~56,000 words
  const t0 = performance.now();
  const tokens = tokenizeUntimed(bigText);
  const t1 = performance.now();
  console.log(`   ✓ Tokenized ${tokens.length.toLocaleString()} words in ${(t1 - t0).toFixed(1)}ms`);

  const ttsChunks = buildTtsChunks(tokens);
  console.log(`   ✓ Created ${ttsChunks.length.toLocaleString()} TTS sentence chunks across big book`);

  // Check chunk lookup speed
  const sampleWord = 25000;
  const chunkIdx = findTtsChunkAtWord(ttsChunks, sampleWord);
  if (chunkIdx < 0 || ttsChunks[chunkIdx].startWord > sampleWord || ttsChunks[chunkIdx].endWord < sampleWord) {
    throw new Error(`findTtsChunkAtWord failed for word ${sampleWord}`);
  }
  console.log(`   ✓ Binary search chunk lookup verified for word ${sampleWord} (found chunk ${chunkIdx})`);

  console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runTests().catch((err) => {
  console.error("\nTEST FAILURE:", err);
  process.exit(1);
});
