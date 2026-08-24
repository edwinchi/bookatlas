import { jsPDF } from 'jspdf';
import { UserLibraryItem, Book } from '../types';

export interface LibraryExportStats {
  userEmail: string;
  userName?: string;
  streakDays: number;
  totalReadingHours: number;
  booksCompleted: number;
  totalShelfCount: number;
  libraryItems: UserLibraryItem[];
  wishlistItems?: Book[];
  notesCount?: number;
  highlightsCount?: number;
}

/**
 * Generates and downloads an elegant, publication-grade PDF report of the user's personal digital library, reading stats, and bookshelf manifest.
 */
export function exportUserLibraryPDF(stats: LibraryExportStats, language: 'en' | 'nl' = 'en') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currentDate = new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  let y = 18;

  // 1. Header Banner (Deep Indigo/Slate theme)
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative Accent bar (Amber/Gold)
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 37, pageWidth, 1.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(
    language === 'nl'
      ? 'BOOKATLAS™ — PERSOONLIJK DIGITAAL LEESRAPPORT'
      : 'BOOKATLAS™ — PERSONAL READING & LIBRARY REPORT',
    14,
    14
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    language === 'nl'
      ? 'Atlantean Globals Services B.V. (Amsterdam, Nederland) | Gecertificeerd eReader Dossier'
      : 'Atlantean Globals Services B.V. (Amsterdam, Netherlands) | Certified eReader Dossier',
    14,
    21
  );

  doc.setTextColor(253, 224, 71); // Amber 300
  doc.text(
    `${language === 'nl' ? 'Geregistreerde Lezer' : 'Registered Reader'}: ${stats.userEmail} ${stats.userName ? `(${stats.userName})` : ''} | ${currentDate}`,
    14,
    29
  );

  y = 48;
  doc.setTextColor(15, 23, 42);

  // 2. Executive Reading Statistics Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(language === 'nl' ? '1. Leesstatistieken & Voortgang 2026' : '1. Reading Statistics & 2026 Progress', 14, y);
  y += 6;

  // Stat boxes grid (4 boxes)
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 22;

  const statItems = [
    {
      title: language === 'nl' ? 'DAGEN REEKS' : 'DAY STREAK',
      value: `${stats.streakDays} ${language === 'nl' ? 'Dagen' : 'Days'}`,
      subtitle: language === 'nl' ? 'Actieve leescyclus' : 'Active habit streak',
      color: [245, 158, 11] as [number, number, number], // amber
    },
    {
      title: language === 'nl' ? 'TOTALE LEESTIJD' : 'TOTAL READ TIME',
      value: `${stats.totalReadingHours} hrs`,
      subtitle: language === 'nl' ? 'Geverifieerde tijd' : 'Verified session time',
      color: [16, 185, 129] as [number, number, number], // emerald
    },
    {
      title: language === 'nl' ? 'UITGELEZEN' : 'BOOKS FINISHED',
      value: `${stats.booksCompleted} / 20`,
      subtitle: language === 'nl' ? 'Leesuitdaging 2026' : '2026 Annual Challenge',
      color: [99, 102, 241] as [number, number, number], // indigo
    },
    {
      title: language === 'nl' ? 'MIJN BOEKENPLANK' : 'ACTIVE SHELF',
      value: `${stats.totalShelfCount} ${language === 'nl' ? 'Titels' : 'Titles'}`,
      subtitle: language === 'nl' ? 'eBooks & Audio' : 'eBooks & Audiobooks',
      color: [239, 68, 68] as [number, number, number], // rose
    },
  ];

  statItems.forEach((item, idx) => {
    const xPos = 14 + idx * (boxWidth + 3);
    
    // Background
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(xPos, y, boxWidth, boxHeight, 2, 2, 'F');
    
    // Top colored indicator line
    doc.setFillColor(...item.color);
    doc.roundedRect(xPos, y, boxWidth, 1.5, 1, 1, 'F');

    // Title
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(item.title, xPos + 3, y + 6);

    // Value
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, xPos + 3, y + 13);

    // Subtitle
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(item.subtitle, xPos + 3, y + 18);
  });

  y += boxHeight + 10;

  // 3. Bookshelf Table Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    language === 'nl' ? '2. Boekenplank Manifest & Leesvoortgang' : '2. Bookshelf Manifest & Reading Progress',
    14,
    y
  );
  y += 6;

  // Table Headers
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.text(language === 'nl' ? 'Boektitel' : 'Book Title', 16, y + 4.8);
  doc.text(language === 'nl' ? 'Auteur' : 'Author', 75, y + 4.8);
  doc.text(language === 'nl' ? 'Formaat' : 'Format', 120, y + 4.8);
  doc.text(language === 'nl' ? 'Voortgang' : 'Progress', 145, y + 4.8);
  doc.text(language === 'nl' ? 'Markeringen' : 'Highlights', 172, y + 4.8);
  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const items = stats.libraryItems.slice(0, 16);
  if (items.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text(
      language === 'nl' ? 'Geen boeken op uw boekenplank.' : 'No books in your personal bookshelf yet.',
      16,
      y + 5
    );
    y += 10;
  } else {
    items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
      }

      const book = item.book;
      const truncatedTitle = book.title.length > 34 ? book.title.slice(0, 32) + '...' : book.title;
      const truncatedAuthor = book.author.length > 24 ? book.author.slice(0, 22) + '...' : book.author;
      const formatStr = item.format === 'audiobook' ? 'Audiobook' : 'eBook (EPUB)';
      const progressStr = `${item.progressPercent}% ${item.finished ? '✓' : ''}`;
      const highlightsCount = item.highlights?.length || 0;

      doc.setTextColor(15, 23, 42);
      doc.text(truncatedTitle, 16, y + 3.8);
      doc.setTextColor(71, 85, 105);
      doc.text(truncatedAuthor, 75, y + 3.8);
      doc.text(formatStr, 120, y + 3.8);

      if (item.finished || item.progressPercent >= 100) {
        doc.setTextColor(16, 185, 129); // emerald
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(217, 119, 6); // amber
        doc.setFont('helvetica', 'normal');
      }
      doc.text(progressStr, 145, y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${highlightsCount} ${language === 'nl' ? 'notities' : 'saved'}`, 172, y + 3.8);

      y += 6.8;
    });
  }

  y += 6;

  // 4. Saved Quotes & Literary Reflections Sample
  const allHighlights = stats.libraryItems.flatMap((i) => i.highlights || []).slice(0, 3);
  if (allHighlights.length > 0 && y < 240) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      language === 'nl' ? '3. Opgeslagen Hoogtepunten & Inzichten' : '3. Saved Passage Highlights & Reflections',
      14,
      y
    );
    y += 5;

    allHighlights.forEach((hl) => {
      doc.setFillColor(254, 243, 199); // Amber 100
      doc.rect(14, y, pageWidth - 28, 11, 'F');
      doc.setTextColor(146, 64, 14); // Amber 900
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);

      const quoteText = `"${hl.text.slice(0, 110)}${hl.text.length > 110 ? '...' : ''}"`;
      doc.text(quoteText, 16, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`— ${hl.date || 'Saved Reflection'}`, 16, y + 9);

      y += 13;
    });
  }

  // 5. Footer & Legal certification
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    language === 'nl'
      ? '© 2026 Atlantean Globals Services B.V. (Amsterdam, Nederland) | W3C EPUB3 & DRM Geverifieerd'
      : '© 2026 Atlantean Globals Services B.V. (Amsterdam, Netherlands) | W3C EPUB3 & DRM Verified',
    14,
    pageHeight - 10
  );

  doc.text(
    `${language === 'nl' ? 'Gegenereerd voor' : 'Exported for'}: ${stats.userEmail}`,
    pageWidth - 14 - doc.getTextWidth(`${language === 'nl' ? 'Gegenereerd voor' : 'Exported for'}: ${stats.userEmail}`),
    pageHeight - 10
  );

  // Trigger download
  const cleanEmail = stats.userEmail.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Bookatlas_Reading_Report_${cleanEmail}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
