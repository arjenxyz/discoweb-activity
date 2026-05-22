import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 3600 } 
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch the target URL' }, { status: res.status });
    }

    const html = await res.text();

    const getMetaContent = (nameOrProperty: string) => {
      const regex = new RegExp(
        `<meta[^>]+(?:name|property)=["']${nameOrProperty}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${nameOrProperty}["']`,
        'i'
      );
      const match = html.match(regex);
      return match ? match[1] || match[2] : null;
    };
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const documentTitle = titleMatch ? titleMatch[1] : null;

    const title = getMetaContent('og:title') || getMetaContent('twitter:title') || documentTitle;
    const description = getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description');
    const image = getMetaContent('og:image') || getMetaContent('twitter:image');
    const siteName = getMetaContent('og:site_name') || new URL(targetUrl).hostname;
    let themeColor = getMetaContent('theme-color');

    // Discord default embed color if theme color missing
    if (!themeColor) {
      themeColor = '#1e1f22';
    }

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      themeColor,
      url: targetUrl
    });
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred fetching open graph data' }, { status: 500 });
  }
}
