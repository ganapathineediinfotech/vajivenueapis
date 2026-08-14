import express from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Read configuration tokens from system variables securely
dotenv.config();

const app = express();

// Set payload memory threshold limits to allow high-resolution Base64 media data streams
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Initialize the open-source GitHub REST client tool
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

// Destination variables where your folder assets map
const TARGET_OWNER = 'ganapathineediinfotech';
const TARGET_REPO = 'restaurantimages';

/**
 * POST /api/upload-image
 * Body Parameters: { imageName: string, imageBase64: string }
 */
app.post('/api/upload-image', async (req, res) => {
  try {
    const { imageName, imageBase64 } = req.body;

    // Reject incomplete incoming request packages
    if (!imageName || !imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: both "imageName" and "imageBase64" fields must be provided.'
      });
    }

    // Isolate pure payload string content by cutting off metadata type declarations
    const base64DataString = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Normalize name syntax and structure an un-cacheable clean webp path label
    const sanitizedTitle = imageName.replace(/\s+/g, '_').toLowerCase();
    const finalAssetPath = `functionhalls/${sanitizedTitle}_${Date.now()}.webp`;

    // 1. Commit raw base64 buffer payload directly up to GitHub asset repository drive
    await octokit.repos.createOrUpdateFileContents({
      owner: TARGET_OWNER,
      repo: TARGET_REPO,
      path: finalAssetPath,
      message: '📸 service engine upload: added functional hall layout layout asset',
      content: base64DataString,
      branch: 'main'
    });

    // 2. Format local routing URI pattern matching Vercel CDN routing config rules
    const localizedVercelCDNPath = `/cdn-images/${finalAssetPath}`;

    // Respond back to frontend application clients
    return res.status(200).json({
      success: true,
      message: 'Media file committed into cloud asset folders successfully.',
      imageUrl: localizedVercelCDNPath
    });

  } catch (error) {
    console.error('Core Pipeline Crash Event:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal engine runtime error experienced trying to push media data storage components.',
      error: error.message
    });
  }
});

// Connect network streaming interface bindings matching Render automation setups
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 VajiVenue API server execution engine active on port ${PORT}`);
});