import { NextResponse, type NextRequest } from 'next/server';

// Proxy endpoint for large files - forwards to Render backend and transforms response
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/scan/file-large] Request received');
    const startTime = Date.now();
    
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[API /api/scan/file-large] File received:', file.name, file.size, 'bytes');
    
    // Forward to Render backend
    const backendUrl = process.env.EMBER_API_URL || process.env.NEXT_PUBLIC_EMBER_API_URL || 'https://neuroshield-backend.onrender.com';
    console.log('[API /api/scan/file-large] Forwarding to:', `${backendUrl}/scan`);
    
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    
    const backendResponse = await fetch(`${backendUrl}/scan`, {
      method: 'POST',
      body: backendFormData,
    });
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[API /api/scan/file-large] Backend error:', errorText);
      return NextResponse.json({ 
        error: `Backend scan failed: ${errorText}` 
      }, { status: backendResponse.status });
    }
    
    const backendResult = await backendResponse.json();
    console.log('[API /api/scan/file-large] Backend response:', backendResult);
    
    // Transform backend response to match ScanFileOutput format
    const transformedResult = {
      status: backendResult.error ? 'error' : 'completed',
      threatLabel: backendResult.threat_level || backendResult.verdict || 'Unknown',
      scanDate: Math.floor(Date.now() / 1000),
      fileInfo: {
        name: file.name,
        size: file.size,
        md5: backendResult.md5 || null,
        sha1: backendResult.sha1 || null,
        sha256: backendResult.sha256 || null,
      },
      stats: {
        malicious: backendResult.verdict?.toLowerCase().includes('malicious') ? 1 : 0,
        suspicious: backendResult.verdict?.toLowerCase().includes('suspicious') ? 1 : 0,
        harmless: backendResult.verdict?.toLowerCase().includes('clean') || backendResult.verdict?.toLowerCase().includes('benign') ? 1 : 0,
        undetected: 0,
        timeout: 0,
      },
      results: {
        'NeuroShield_AI_Model': {
          category: 'type-unsupported',
          engine_name: 'NeuroShield_Analysis_Engine',
          result: `${backendResult.verdict} (${backendResult.confidence}%)`,
          method: 'machine_learning',
        }
      },
      analysisId: `neuroshield-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      permalink: null,
      error: backendResult.error || null,
    };
    
    const totalTime = Date.now() - startTime;
    console.log('[API /api/scan/file-large] Total processing time:', totalTime, 'ms');
    
    return NextResponse.json(transformedResult, { status: 200 });
    
  } catch (error: any) {
    console.error('[API /api/scan/file-large] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'This endpoint expects a POST request with a file to scan.' 
  }, { status: 405 });
}
