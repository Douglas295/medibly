import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import axios from 'axios'

const {
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
  PBI_WORKSPACE_ID,
  PBI_REPORT_ID,
  PBI_DATASET_ID,
} = process.env

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { selectedMonth } = body;

  if (!selectedMonth) {
    return NextResponse.json({ error: 'Missing selectedMonth' }, { status: 400 });
  }
  const userId = parseInt(session.user.id, 10);

  const existPost = await prisma.post.findFirst({
    where: { month:selectedMonth, authorId: userId }, // replace with your actual field
  });

  if (!existPost) {
    return new Response(JSON.stringify({ error: 'There is no such uploaded data' }), {
      status: 200,
    });
  }

  try {
    if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID || !AZURE_CLIENT_SECRET) {
      throw new Error('Azure credentials are not set in environment variables.')
    }

    // Step 1: Get Power BI Access Token
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AZURE_CLIENT_ID!,
        client_secret: AZURE_CLIENT_SECRET!,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const powerBiToken = tokenRes.data.access_token;

    // Step 2: Generate Embed Token with dynamic filtering (date range passed as username)
    const embedRes = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${PBI_WORKSPACE_ID}/reports/${PBI_REPORT_ID}/GenerateToken`,
      {
        accessLevel: 'View',
        identities: [
          {
            username: session.user.email,
            roles: ['UserRole'], // RLS role
            datasets: [PBI_DATASET_ID],
            customData: selectedMonth, 
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${powerBiToken}`,
        },
      }
    );
 
    return NextResponse.json({
      embedUrl: embedRes.data.embedUrl,
      accessToken: embedRes.data.token,
    });
  } catch (error) {
    console.error('POST /api/powerbi error:', error);
    return NextResponse.json({ error: 'Power BI error' }, { status: 500 });
  }
}
