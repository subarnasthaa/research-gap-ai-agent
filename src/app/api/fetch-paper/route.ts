import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Handle arXiv URLs
    let fetchUrl = url;
    let isArxiv = false;

    if (url.includes('arxiv.org')) {
      isArxiv = true;
      // Convert arXiv abstract page to PDF URL or HTML URL
      const arxivId = url.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/)?.[1];
      if (arxivId) {
        // Try to fetch the HTML version first for text extraction
        fetchUrl = `https://arxiv.org/abs/${arxivId}`;
      }
    }

    // Handle DOI URLs
    if (url.includes('doi.org') || url.match(/^10\.\d{4,}/)) {
      const doi = url.replace('https://doi.org/', '').replace('http://doi.org/', '');
      fetchUrl = `https://api.unpaywall.org/v2/${doi}?email=research-gap-agent@example.com`;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'ResearchGapAIAgent/1.0',
        Accept: 'text/html,application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    let text = '';
    let title = '';
    let abstract = '';

    if (contentType.includes('application/json') && url.includes('unpaywall')) {
      const data = await response.json();
      title = data.title || 'Unknown Title';
      abstract = data.abstract || '';
      text = `${title}\n\nAbstract\n${abstract}\n\n${data.abstract || ''}`;
    } else {
      const html = await response.text();
      // Simple HTML to text conversion
      text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      // Try to extract title from arXiv page
      if (isArxiv) {
        const titleMatch = html.match(/<meta\s+name="citation_title"\s+content="([^"]+)"/i)
          || html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/i)
          || html.match(/<title>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : 'Research Paper';

        const abstractMatch = html.match(/<meta\s+name="citation_abstract"\s+content="([^"]+)"/i)
          || html.match(/<blockquote[^>]*class="[^"]*abstract[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/i);
        abstract = abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      }
    }

    return NextResponse.json({
      success: true,
      text: text.substring(0, 50000), // Limit text size
      title,
      abstract,
      sourceUrl: url,
    });
  } catch (error) {
    console.error('Fetch paper API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
