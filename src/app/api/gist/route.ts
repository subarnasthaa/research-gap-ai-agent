import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, files, description, public: isPublic } = body;

    if (!token) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 });
    }

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const gistPayload = {
      description: description || 'Research Gap Analysis Report',
      public: isPublic || false,
      files,
    };

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Research-Gap-AI-Agent',
      },
      body: JSON.stringify(gistPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown GitHub API error' }));
      return NextResponse.json(
        { error: errorData.message || `GitHub API error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      id: result.id,
      html_url: result.html_url,
      url: result.url,
      created_at: result.created_at,
    });
  } catch (error) {
    console.error('Gist creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
