import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import prisma from '@/lib/prisma'; // Adjust if your prisma path differs
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Constants
const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;
const MARGIN_TOP = 120;
const MARGIN_BOTTOM = 40;
const LINE_HEIGHT = 30;
const START_Y = 200;
const MAX_LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - START_Y - MARGIN_BOTTOM) / LINE_HEIGHT);

export async function POST(req: NextRequest) {

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be logged in to create a post' }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || "Unknown month";

  // ✅ Check if post already exists
  const post = await prisma.post.findFirst({
    where: {
      month,
      authorId: userId,
    },
  });

  if(!post){
    return NextResponse.json({ error: 'Post is not exist' }, { status: 404 });
  }
  // 1. Fetch raw data
  const data = await prisma.billingReport.findMany({
    select: { procedure: true, paid: true },
    where: {  postId: post.id}
  });

  // 2. Group by procedure and sum paids
  const grouped: Record<string, number> = {};
  data.forEach(({ procedure, paid }) => {
    grouped[procedure] = (grouped[procedure] || 0) + paid;
  });
  const groupedData = Object.entries(grouped); // [ ['Alice', 123.45], ['Bob', 98.76], ... ]

  // 3. Create PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentLine = 0;

  // Header
  const now = new Date().toLocaleString();
  page.drawText(`${month} Report: Downloaded at ${now}`, {
    x: 50,
    y: PAGE_HEIGHT - MARGIN_TOP,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });

  // 4. Draw grouped data with pagination
  groupedData.forEach(([procedure, total]) => {
    // If we’ve reached the limit, start a new page
    if (currentLine >= MAX_LINES_PER_PAGE) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentLine = 0;
    }

    const yPosition = PAGE_HEIGHT - START_Y - currentLine * LINE_HEIGHT;

    page.drawText(`${procedure}: $${total.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    currentLine += 1;
  });

  // 5. Return the PDF as a response
  const pdfBytes = await pdfDoc.save();
 
  // explicitly copy into a new Uint8Array (recommended)
  const copiedUint8Array = new Uint8Array(pdfBytes.length);
  copiedUint8Array.set(pdfBytes);

  // Then create Blob from copiedUint8Array
  const blob = new Blob([copiedUint8Array], { type: 'application/pdf' });

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${month}-profit-report.pdf"`,
    },
  });

}
