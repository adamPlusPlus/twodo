import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // List all files in twodo/ prefix
    const { blobs } = await list({ prefix: 'twodo/' });

    // Format response
    const files = blobs
      .map(blob => ({
        name: blob.pathname.replace('twodo/', ''),
        size: blob.size,
        modified: blob.uploadedAt.toISOString(),
        created: blob.uploadedAt.toISOString(),
      }))
      .sort((a, b) => new Date(b.modified) - new Date(a.modified)); // Most recent first

    res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, error: error.message, files: [] });
  }
}

