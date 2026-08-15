import express from 'express';
import { Octokit } from '@octokit/rest';
import multer from 'multer';
import sharp from 'sharp';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------

app.use(cors());

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({
  limit: '25mb',
  extended: true
}));

// Store uploaded file in memory
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Only JPG, PNG, WEBP and GIF images are allowed.'
        )
      );
    }

    cb(null, true);
  }
});

// ----------------------------------------------------
// Environment variables
// ----------------------------------------------------

const PORT = process.env.PORT || 3000;

const GITHUB_ACCESS_TOKEN =
  process.env.GITHUB_ACCESS_TOKEN;

const TARGET_OWNER =
  process.env.GITHUB_OWNER || 'ganapathineediinfotech';

const TARGET_REPO =
  process.env.GITHUB_REPO || 'restaurantimages';

const GITHUB_BRANCH =
  process.env.GITHUB_BRANCH || 'main';

// ----------------------------------------------------
// GitHub client
// ----------------------------------------------------

if (!GITHUB_ACCESS_TOKEN) {
  console.warn(
    'WARNING: GITHUB_ACCESS_TOKEN is not configured.'
  );
}

const octokit = new Octokit({
  auth: GITHUB_ACCESS_TOKEN
});

// ----------------------------------------------------
// Health check
// ----------------------------------------------------

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'VajiVenue Image API',
    status: 'healthy',
    uploadEndpoint: 'POST /api/upload-image'
  });
});

// ----------------------------------------------------
// Upload image
// ----------------------------------------------------

app.post(
  '/api/upload-image',
  upload.single('imageFile'),

  async (req, res) => {
    try {

      // ----------------------------------------------
      // Check GitHub token
      // ----------------------------------------------

      if (!GITHUB_ACCESS_TOKEN) {
        return res.status(500).json({
          success: false,
          message: 'GitHub access token is not configured.'
        });
      }

      // ----------------------------------------------
      // Check file
      // ----------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            'No image file received. Use multipart/form-data with field name "imageFile".'
        });
      }

      // ----------------------------------------------
      // Get image name
      // ----------------------------------------------

      let imageName =
        req.body.imageName || req.file.originalname;

      // Remove extension
      imageName = imageName
        .replace(/\.[^/.]+$/, '');

      // Sanitize filename
      const sanitizedTitle =
        imageName
          .replace(/[^a-zA-Z0-9-_]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();

      const safeName =
        sanitizedTitle || 'vaji_venue_asset';

      // ----------------------------------------------
      // Convert image to WebP
      // ----------------------------------------------

      const webpBuffer = await sharp(req.file.buffer)
        .rotate()
        .webp({
          quality: 85
        })
        .toBuffer();

      // ----------------------------------------------
      // Create GitHub path
      // ----------------------------------------------

      const timestamp = Date.now();

      const finalAssetPath =
        `functionhalls/${safeName}_${timestamp}.webp`;

      // ----------------------------------------------
      // Convert image buffer to Base64
      // ----------------------------------------------

      const base64Data =
        webpBuffer.toString('base64');

      // ----------------------------------------------
      // Upload to GitHub
      // ----------------------------------------------

      const githubResponse =
        await octokit.repos.createOrUpdateFileContents({

          owner: TARGET_OWNER,

          repo: TARGET_REPO,

          path: finalAssetPath,

          message:
            `Upload venue image: ${safeName}`,

          content: base64Data,

          branch: GITHUB_BRANCH

        });

      // ----------------------------------------------
      // GitHub raw URL
      // ----------------------------------------------

      const rawImageUrl =
        `https://raw.githubusercontent.com/` +
        `${TARGET_OWNER}/` +
        `${TARGET_REPO}/` +
        `${GITHUB_BRANCH}/` +
        `${finalAssetPath}`;

      // ----------------------------------------------
      // Response
      // ----------------------------------------------

      return res.status(200).json({

        success: true,

        message:
          'Image uploaded successfully.',

        fileName:
          `${safeName}_${timestamp}.webp`,

        path:
          finalAssetPath,

        imageUrl:
          rawImageUrl,

        githubUrl:
          githubResponse.data.content.html_url

      });

    } catch (error) {

      console.error(
        'IMAGE UPLOAD ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Failed to upload image.',

        error:
          error.message

      });
    }
  }
);

// ----------------------------------------------------
// Multer / general error handler
// ----------------------------------------------------

app.use((error, req, res, next) => {

  console.error(
    'SERVER ERROR:',
    error
  );

  if (
    error instanceof multer.MulterError
  ) {

    if (
      error.code === 'LIMIT_FILE_SIZE'
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Image size cannot exceed 25 MB.'

      });
    }

    return res.status(400).json({

      success: false,

      message:
        error.message

    });
  }

  return res.status(400).json({

    success: false,

    message:
      error.message || 'Request failed.'

  });
});

// ----------------------------------------------------
// Start server
// ----------------------------------------------------

app.listen(PORT, () => {

  console.log(
    `VajiVenue API running on port ${PORT}`
  );

});