import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { jsPDF } from 'jspdf';
import { Book } from '../types';

export interface PlatformDocumentationData {
  platformName: string;
  companyName: string;
  country: string;
  date: string;
  books: Book[];
}

/**
 * Generates and triggers download of a genuine Microsoft Word (.docx) document
 */
export async function downloadWordDocument(books: Book[]) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Document Title
          new Paragraph({
            text: 'BOOKATLAS™ — ENTERPRISE DIGITAL BOOKSTORE & EREADER PLATFORM',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: `Comprehensive Platform Architecture, Autonomous Operations & AI Technical Specifications`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Publisher & Legal Entity: `, bold: true }),
              new TextRun(`Atlantean Globals Services B.V. (Amsterdam, The Netherlands)\n`),
              new TextRun({ text: `Document Version: `, bold: true }),
              new TextRun(`v3.8.0 Enterprise Release | `),
              new TextRun({ text: `Date: `, bold: true }),
              new TextRun(`${currentDate}\n`),
              new TextRun({ text: `Compliance: `, bold: true }),
              new TextRun(`DRM-Protected EPUB3, W3C Web Publications, GDPR (EU-2016/679)`),
            ],
            spacing: { after: 500 },
          }),

          // SECTION 1: Executive Summary
          new Paragraph({
            text: '1. Executive Summary & Company Profile',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Bookatlas is an ultra-fast, modern digital bookstore, full-featured in-browser EPUB3 eReader, and autonomous single-manager publishing studio engineered by Atlantean Globals Services B.V., registered and headquartered in Amsterdam, Netherlands. The platform delivers an unmatched digital reading and listening experience, pairing curated European and international literature with autonomous AI agents powered by the Google Gemini ecosystem.',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Headquarters: ', bold: true }),
              new TextRun('Keizersgracht Historic Publishing District, Amsterdam, Netherlands\n'),
              new TextRun({ text: '• Core Offering: ', bold: true }),
              new TextRun('Over 1.5M digital eBooks, Studio Audiobooks, and Bookatlas Plus unlimited reading subscription at €9.99/month\n'),
              new TextRun({ text: '• Single Manager Autopilot: ', bold: true }),
              new TextRun('Autonomous catalog management, algorithmic dynamic pricing, flash sales (-40%), and multi-channel marketing campaigns.'),
            ],
            spacing: { after: 300 },
          }),

          // SECTION 2: Technical Architecture
          new Paragraph({
            text: '2. Technical Architecture & Technology Stack',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Frontend: ', bold: true }),
              new TextRun('React 19, TypeScript, Tailwind CSS v4, Motion layout animations, Lucide icons, Canvas Confetti\n'),
              new TextRun({ text: '• Backend & Middleware: ', bold: true }),
              new TextRun('Node.js, Express, tsx runtime development server, and bundled standalone esbuild CommonJS (dist/server.cjs)\n'),
              new TextRun({ text: '• Single-Port Ingress: ', bold: true }),
              new TextRun('Runs on Port 3000 bound to host 0.0.0.0 for seamless containerized cloud deployments\n'),
              new TextRun({ text: '• Digital Rights & EPUB3 Engine: ', bold: true }),
              new TextRun('Compliant with W3C EPUB3 standard, client-side pagination, paragraph-level offset synchronization, and offline cache storage.'),
            ],
            spacing: { after: 300 },
          }),

          // SECTION 3: Google Gemini AI & Multi-Modal Ecosystem
          new Paragraph({
            text: '3. Google Gemini AI & Multi-Modal Intelligence Suite',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Multi-Turn Conversational Chatbot: ', bold: true }),
              new TextRun('Features customizable persona roles (Literary Scholar, Dutch & European Curator, Creative Writing Mentor, Speed Summarizer) supporting gemini-3.1-pro-preview for deep analysis, gemini-3.5-flash for general inquiries, and gemini-3.1-flash-lite for rapid sub-second responses.\n\n'),
              new TextRun({ text: '2. Real-Time Live Voice Dialogue Companion: ', bold: true }),
              new TextRun('Powered by gemini-3.1-flash-live-preview and Gemini TTS, enabling fluid spoken conversations with voice personas like Zephyr and Kore.\n\n'),
              new TextRun({ text: '3. Google Search Grounding Literary Radar: ', bold: true }),
              new TextRun('Uses gemini-3.5-flash with googleSearch tool to retrieve real-time bestseller charts (CPNB Netherlands, New York Times, Spiegel), literary prize updates (Booker, Nobel, Libris), and author tour schedules with verified source URLs.\n\n'),
              new TextRun({ text: '4. Veo Video Cover Animator: ', bold: true }),
              new TextRun('Leverages veo-3.1-fast-generate-preview and veo-3.1-lite-generate-preview to animate static 2D book covers and photos into cinematic 16:9 trailers and 9:16 mobile reels.\n\n'),
              new TextRun({ text: '5. Autonomous Manuscript Generator: ', bold: true }),
              new TextRun('Uses Gemini 3.7 Flash to synthesize complete, published-grade original books across 15 distinct categories with multi-paragraph sample chapters, narrator assignments, and marketing metadata.'),
            ],
            spacing: { after: 300 },
          }),

          // SECTION 4: In-Browser eReader & Digital Reader Suite
          new Paragraph({
            text: '4. In-Browser eReader & Reading Ergonomics',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Color Palettes: ', bold: true }),
              new TextRun('5 scientifically calibrated reading modes: Day (Crisp Light), Sepia (Warm Paper), Night (OLED Slate), Mint (Eye-Comfort), and Black (High Contrast Deep AMOLED)\n'),
              new TextRun({ text: '• Typographic Customization: ', bold: true }),
              new TextRun('Literata Book Serif, Clean Sans-Serif, and Monospace with adjustable font sizes (14px–28px) and line height (1.4–2.2x)\n'),
              new TextRun({ text: '• Reading Tools: ', bold: true }),
              new TextRun('Interactive 4-color highlighters (Yellow, Green, Blue, Pink), bookmark management, reading speed calculator, and built-in Text-to-Speech narration\n'),
              new TextRun({ text: '• AI Reading Copilot: ', bold: true }),
              new TextRun('Instant in-text explanations, 3-bullet chapter summaries, character psychological subtext analysis, and literary etymology.'),
            ],
            spacing: { after: 300 },
          }),

          // SECTION 5: Single Manager Operations Studio
          new Paragraph({
            text: '5. Single Manager Operations Studio',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Live Inventory Control: ', bold: true }),
              new TextRun('Full CRUD capabilities to add, edit, delete, preview, and update prices across all 15 genres in real time\n'),
              new TextRun({ text: '• Dynamic Yield & Flash Sales: ', bold: true }),
              new TextRun('1-click batch pricing strategies including Weekend Flash Sales (-40%), Bookatlas Plus Catalog Expansion, and Bestseller badge algorithms\n'),
              new TextRun({ text: '• AI Multi-Channel Campaign Kit: ', bold: true }),
              new TextRun('Generates email newsletters, 4-part social media threads, and book club guides for any book\n'),
              new TextRun({ text: '• Real-Time Audit Trail: ', bold: true }),
              new TextRun('Chronological activity log tracking every catalog modification, price update, and AI manuscript generation.'),
            ],
            spacing: { after: 400 },
          }),

          // SECTION 6: Current Catalog Manifest Table
          new Paragraph({
            text: '6. Active Book Catalog Manifest (Sample Records)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Title', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Author', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Price (€)', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bookatlas Plus', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rating', bold: true })] })] }),
                ],
              }),

              ...books.slice(0, 12).map(
                (b) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(b.title)] }),
                      new TableCell({ children: [new Paragraph(b.author)] }),
                      new TableCell({ children: [new Paragraph(b.primaryGenre)] }),
                      new TableCell({ children: [new Paragraph(`€${b.price.toFixed(2)}`)] }),
                      new TableCell({ children: [new Paragraph(b.isBookatlasPlus ? 'Yes' : 'No')] }),
                      new TableCell({ children: [new Paragraph(`★ ${b.rating}`)] }),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 7: Legal & Copyright
          new Paragraph({
            text: '7. Legal, Licensing & Compliance',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '© 2026 Atlantean Globals Services B.V. Registered under the laws of the Netherlands. All intellectual property, EPUB3 processing routines, AI orchestration pipelines, and digital bookstore assets are strictly protected. For inquiries, contact legal@atlanteanglobals.nl.',
              }),
            ],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  // Pack into a Blob and trigger browser download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bookatlas_Complete_Platform_Architecture_and_Specifications_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers download of a genuine, high-quality PDF document
 */
export function downloadPDFDocument(books: Book[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  let y = 20;

  // Header Banner
  doc.setFillColor(30, 27, 75); // Indigo 950
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BOOKATLAS™ — ENTERPRISE DIGITAL BOOKSTORE', 15, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Platform Technical Specifications & Autonomous Architecture', 15, 22);
  doc.text(`Atlantean Globals Services B.V. (Netherlands) | ${currentDate}`, 15, 27);

  y = 42;
  doc.setTextColor(30, 30, 30);

  // Section 1: Executive Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Executive Summary & Corporate Profile', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const summaryText = `Bookatlas is an enterprise-grade digital bookstore, in-browser EPUB3 eReader, and autonomous single-manager publishing studio engineered by Atlantean Globals Services B.V. in Amsterdam, Netherlands. It integrates over 1.5M digital titles, audiobooks, and Bookatlas Plus unlimited subscriptions with cutting-edge Gemini AI models.`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 30);
  doc.text(splitSummary, 15, y);
  y += splitSummary.length * 5 + 4;

  // Section 2: Technology Stack
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Technology Stack & Runtime Architecture', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const techPoints = [
    '• Frontend: React 19, TypeScript, Tailwind CSS v4, Motion layout animations, Lucide icons, Canvas Confetti.',
    '• Backend: Node.js, Express, tsx runtime server, esbuild CommonJS self-contained production bundle (dist/server.cjs).',
    '• Network & Ingress: Dedicated port 3000 bound to host 0.0.0.0 for seamless cloud container ingress.',
    '• eReader Engine: W3C EPUB3 compliant pagination, 5 reading palettes, 3 typography engines, TTS narration.'
  ];
  techPoints.forEach((point) => {
    const splitPoint = doc.splitTextToSize(point, pageWidth - 30);
    doc.text(splitPoint, 15, y);
    y += splitPoint.length * 5 + 1;
  });
  y += 4;

  // Section 3: Gemini AI & Multi-Modal Capabilities
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. Google Gemini AI Multi-Modal Ecosystem', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const aiPoints = [
    '• Multi-Turn Chatbot: gemini-3.1-pro-preview (Deep reasoning), gemini-3.5-flash (Balanced), gemini-3.1-flash-lite (Speed).',
    '• Live Voice Companion: gemini-3.1-flash-live-preview for low-latency conversational audio dialogue.',
    '• Google Search Grounding: gemini-3.5-flash with googleSearch tool for live European bestseller radars & awards.',
    '• Veo Video Generator: veo-3.1-fast-generate-preview animating book covers into 16:9 & 9:16 cinematic trailers.',
    '• Autonomous Manuscript Creator: Gemini 3.7 Flash generating complete original books across 15 categories.'
  ];
  aiPoints.forEach((point) => {
    const splitPoint = doc.splitTextToSize(point, pageWidth - 30);
    doc.text(splitPoint, 15, y);
    y += splitPoint.length * 5 + 1;
  });
  y += 6;

  // Section 4: Single Manager Portal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('4. Single Manager Operations Studio', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const managerPoints = [
    '• Real-Time Catalog CRUD: Instant creation, price updates, Bookatlas Plus toggles, and metadata edits.',
    '• Dynamic Yield & Flash Sales: 1-click batch discounting (-40%) and subscriber catalog expansion.',
    '• AI Multi-Channel Campaign Studio: Automated generation of email newsletters, social threads, and book club questions.',
    '• Live Audit Trail: Timestamped log of all autonomous publishing events, price optimizations, and inventory syncs.'
  ];
  managerPoints.forEach((point) => {
    const splitPoint = doc.splitTextToSize(point, pageWidth - 30);
    doc.text(splitPoint, 15, y);
    y += splitPoint.length * 5 + 1;
  });

  // PAGE 2: Catalog Manifest & Corporate Certifications
  doc.addPage();
  y = 20;

  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('BOOKATLAS™ — CATALOG MANIFEST & LEGAL COMPLIANCE', 15, 12);

  y = 28;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('5. Active Bookstore Catalog (Top Titles)', 15, y);
  y += 8;

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Title', 18, y + 5);
  doc.text('Author', 75, y + 5);
  doc.text('Category', 115, y + 5);
  doc.text('Price', 155, y + 5);
  doc.text('Rating', 175, y + 5);
  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  books.slice(0, 14).forEach((book, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 1, pageWidth - 30, 6, 'F');
    }
    const truncatedTitle = book.title.length > 32 ? book.title.slice(0, 30) + '...' : book.title;
    const truncatedAuthor = book.author.length > 22 ? book.author.slice(0, 20) + '...' : book.author;
    const truncatedGenre = book.primaryGenre.length > 22 ? book.primaryGenre.slice(0, 20) + '...' : book.primaryGenre;

    doc.text(truncatedTitle, 18, y + 3.5);
    doc.text(truncatedAuthor, 75, y + 3.5);
    doc.text(truncatedGenre, 115, y + 3.5);
    doc.text(`€${book.price.toFixed(2)}`, 155, y + 3.5);
    doc.text(`★ ${book.rating}`, 175, y + 3.5);
    y += 6.2;
  });

  y += 10;
  // Legal & Certification
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('6. Dutch & European Compliance Assurance', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const legalText = `All digital operations comply with Dutch Consumer Rights legislation, the European Union General Data Protection Regulation (GDPR / EU 2016/679), and international W3C EPUB3 standard specifications. All payments and DRM operations are secured via Atlantean Globals Services B.V. (Keizersgracht, Amsterdam, The Netherlands).`;
  const splitLegal = doc.splitTextToSize(legalText, pageWidth - 30);
  doc.text(splitLegal, 15, y);
  y += splitLegal.length * 4.5 + 8;

  // Footer on page 2
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 275, pageWidth - 15, 275);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('© 2026 Atlantean Globals Services B.V. (Amsterdam, Netherlands) | Confidential Technical Report', 15, 282);

  doc.save(`Bookatlas_Complete_Platform_Architecture_and_Specifications_${new Date().toISOString().slice(0, 10)}.pdf`);
}
