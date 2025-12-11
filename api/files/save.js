import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { filename, data } = req.body;

    if (!filename) {
      res.status(400).json({ success: false, error: 'Filename is required' });
      return;
    }

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Ensure data is a string
    const contentString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    // Save to Vercel Blob Storage
    const blob = await put(`twodo/${safeFilename}`, contentString, {
      access: 'public',
      contentType: 'application/json',
    });

    res.status(200).json({
      success: true,
      filename: safeFilename,
      url: blob.url,
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

