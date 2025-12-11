import { get, list } from '@vercel/blob';

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
    const { filename } = req.query;

    if (!filename) {
      res.status(400).json({ success: false, error: 'Filename is required' });
      return;
    }

    // Decode filename (it comes URL-encoded)
    const decodedFilename = decodeURIComponent(filename);
    
    // Sanitize filename
    const safeFilename = decodedFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobPath = `twodo/${safeFilename}`;

    // List blobs to find the exact match
    const { blobs } = await list({ prefix: blobPath });
    
    // Find exact match
    const blob = blobs.find(b => b.pathname === blobPath);
    
    if (!blob) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    // Get the blob content
    const fileBlob = await get(blob.url);
    const content = await fileBlob.text();

    res.status(200).json({
      success: true,
      filename: safeFilename,
      data: JSON.parse(content), // Parse JSON for twodo
    });
  } catch (error) {
    console.error('Error loading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

