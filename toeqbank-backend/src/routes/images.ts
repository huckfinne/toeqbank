import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { ImageModel } from '../models/Image';
import { requireAuth } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/images');
    console.log('Upload destination path:', uploadPath);
    try {
      if (!fs.existsSync(uploadPath)) {
        console.log('Creating upload directory:', uploadPath);
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (error: any) {
      console.error('Error creating upload directory:', error);
      cb(error, uploadPath);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `toe_${uniqueSuffix}${extension}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

router.post('/upload', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is an image contributor and has reached the limit
    if (req.user.is_image_contributor && !req.user.is_admin && !req.user.is_reviewer) {
      const uploadCount = await ImageModel.countByUser(req.user.id);
      if (uploadCount >= 20) {
        // Delete the uploaded file since we won't use it
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.warn('Failed to delete uploaded file after limit reached:', req.file.path);
        }
        return res.status(403).json({ 
          error: 'Upload limit reached', 
          message: 'Image contributors are limited to 20 image uploads. Please contact an administrator if you need to upload more images.',
          currentCount: uploadCount,
          limit: 20
        });
      }
    }

    console.log('Upload request received. File:', req.file.originalname);
    console.log('Request body:', req.body);
    console.log('User:', req.user.username, 'ID:', req.user.id);

    const { description, tags, image_type, license, license_details } = req.body;
    
    const imageType = image_type || (req.file.mimetype.startsWith('video/') ? 'cine' : 'still');
    
    const imageData = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      image_type: imageType as 'still' | 'cine',
      description: description || null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      license: license || 'user-contributed',
      license_details: license_details || null,
      width: undefined,  // Use undefined instead of null for optional fields
      height: undefined,
      duration_seconds: undefined,
      source_url: undefined,
      uploaded_by: req.user.id
    };

    console.log('Image data to save:', imageData);

    const image = await ImageModel.create(imageData);
    console.log('Image saved successfully:', image.id);
    res.status(201).json(image);
  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Failed to upload image', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// URL upload endpoint
router.post('/upload-url', requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if user is an image contributor and has reached the limit
    if (req.user.is_image_contributor && !req.user.is_admin && !req.user.is_reviewer) {
      const uploadCount = await ImageModel.countByUser(req.user.id);
      if (uploadCount >= 20) {
        return res.status(403).json({ 
          error: 'Upload limit reached', 
          message: 'Image contributors are limited to 20 image uploads. Please contact an administrator if you need to upload more images.',
          currentCount: uploadCount,
          limit: 20
        });
      }
    }

    console.log('=== UPLOAD-URL REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user.username, 'ID:', req.user.id);
    
    const { 
      url, 
      description, 
      tags, 
      image_type, 
      license, 
      license_details, 
      source_url,
      modality,
      echo_view,
      usage_type
    } = req.body;

    if (!url) {
      console.log('ERROR: No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Processing URL:', url);

    // Download the image from the URL
    const downloadImage = (imageUrl: string): Promise<{ buffer: Buffer, filename: string, mimetype: string, size: number }> => {
      return new Promise((resolve, reject) => {
        const client = imageUrl.startsWith('https:') ? https : http;
        
        // Set up request options with proper headers
        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          }
        };
        
        client.get(imageUrl, options, (response) => {
          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to fetch image: ${response.statusCode}`));
          }

          const chunks: Buffer[] = [];
          let totalSize = 0;

          response.on('data', (chunk) => {
            chunks.push(chunk);
            totalSize += chunk.length;
          });

          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const urlPath = new URL(imageUrl).pathname;
            const filename = path.basename(urlPath) || 'image';
            const mimetype = response.headers['content-type'] || 'image/jpeg';
            
            resolve({ buffer, filename, mimetype, size: totalSize });
          });
        }).on('error', (error) => {
          reject(error);
        });
      });
    };

    let downloadResult;
    try {
      console.log('Starting download from URL:', url);
      downloadResult = await downloadImage(url);
      console.log('Download successful. File size:', downloadResult.size, 'bytes');
    } catch (downloadError: any) {
      console.error('Download failed:', downloadError.message);
      return res.status(400).json({ 
        error: 'Failed to download image from URL', 
        details: downloadError.message,
        url: url 
      });
    }
    
    const { buffer, filename, mimetype, size } = downloadResult;

    // Save the file locally
    const uploadPath = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(filename) || '.jpg';
    const savedFilename = `toe_${uniqueSuffix}${extension}`;
    const savedPath = path.join(uploadPath, savedFilename);

    fs.writeFileSync(savedPath, buffer);

    const imageType = image_type || (mimetype.startsWith('video/') ? 'cine' : 'still');
    
    const imageData = {
      filename: savedFilename,
      original_name: filename,
      file_path: savedPath,
      file_size: size,
      mime_type: mimetype,
      image_type: imageType as 'still' | 'cine',
      description: description || null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      license: license || 'user-contributed',
      license_details: license_details || null,
      width: undefined,
      height: undefined,
      duration_seconds: undefined,
      source_url: source_url || url, // Store the original URL
      uploaded_by: req.user.id
    };

    console.log('Creating image in database with data:', JSON.stringify(imageData, null, 2));
    
    let image;
    try {
      image = await ImageModel.create(imageData);
      console.log('=== UPLOAD-URL SUCCESS ===');
      console.log('Saved image:', image.id, image.original_name);
    } catch (dbError: any) {
      console.error('Database save error:', dbError.message);
      console.error('Database error detail:', dbError.detail);
      console.error('Database error code:', dbError.code);
      
      // Clean up the file if database save failed
      try {
        fs.unlinkSync(savedPath);
        console.log('Cleaned up file after database error:', savedPath);
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError);
      }
      
      return res.status(500).json({ 
        error: 'Failed to save image to database', 
        details: dbError.message,
        code: dbError.code
      });
    }
    
    res.status(201).json(image);
  } catch (error: any) {
    console.error('=== UPLOAD-URL ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to upload image from URL', details: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const imageType = req.query.type as 'still' | 'cine' | undefined;
    const license = req.query.license as any;
    const tags = req.query.tags as string;

    let images;
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      images = await ImageModel.findByTags(tagArray, limit, offset);
    } else {
      images = await ImageModel.findAll(limit, offset, imageType, license);
    }

    const totalCount = await ImageModel.getCount(imageType, license);
    
    res.json({
      images,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Image proxy endpoint for external images with CORS issues
router.get('/proxy', (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  console.log('=== PROXY REQUEST START ===');
  console.log('Proxying image:', imageUrl);

  try {
    // Parse URL to determine protocol
    const url = new URL(imageUrl);
    const client = url.protocol === 'https:' ? https : http;
    console.log('Using client:', url.protocol === 'https:' ? 'https' : 'http');

    // Set up request options with proper headers
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    };

    // Make the request
    const proxyReq = client.get(imageUrl, options, (proxyRes) => {
      console.log('=== RESPONSE RECEIVED ===');
      console.log('Status:', proxyRes.statusCode);
      console.log('Content-Type:', proxyRes.headers['content-type']);
      
      // Handle non-200 responses
      if (proxyRes.statusCode !== 200) {
        console.log('Non-200 status code:', proxyRes.statusCode);
        return res.status(proxyRes.statusCode || 500).json({ 
          error: `Failed to fetch image: ${proxyRes.statusMessage}`,
          status: proxyRes.statusCode
        });
      }

      // Forward headers
      console.log('Forwarding successful response...');
      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Pipe the response
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('=== PROXY REQUEST ERROR ===');
      console.error('Error:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch image',
        message: error.message
      });
    });

  } catch (error: any) {
    console.error('=== PROXY SETUP ERROR ===');
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error.message
    });
  }
});

// Get next image for review (Must come before /:id route)
router.get('/next-for-review', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only admins and reviewers can access this
    if (!req.user.is_admin && !req.user.is_reviewer) {
      return res.status(403).json({ error: 'Access denied. Admin or reviewer role required.' });
    }

    // Get next unreviewed image
    const nextImage = await ImageModel.getNextForReview();
    
    if (!nextImage) {
      return res.status(404).json({ 
        message: 'No images pending review',
        stats: {
          total: 0,
          reviewed: 0,
          remaining: 0
        }
      });
    }

    // Get review statistics
    const stats = await ImageModel.getReviewStats();

    res.json({
      image: nextImage,
      stats: stats
    });
  } catch (error) {
    console.error('Get next image for review error:', error);
    res.status(500).json({ error: 'Failed to fetch next image for review' });
  }
});

// Submit review for an image (Must come before /:id route)
router.post('/:id/review', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only admins and reviewers can access this
    if (!req.user.is_admin && !req.user.is_reviewer) {
      return res.status(403).json({ error: 'Access denied. Admin or reviewer role required.' });
    }

    const imageId = parseInt(req.params.id);
    const { rating, status } = req.body;

    if (!rating || rating < 0 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be between 0 and 10' });
    }

    if (!['approved', 'rejected', 'needs_revision'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, or needs_revision' });
    }

    // Submit the review
    const result = await ImageModel.submitReview(imageId, req.user.id, rating, status);
    
    if (!result) {
      return res.status(404).json({ error: 'Image not found or already reviewed' });
    }

    res.json({ 
      message: 'Review submitted successfully',
      review: result
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const image = await ImageModel.findById(id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { description, tags, image_type, license, license_details } = req.body;
    
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }
    if (image_type !== undefined) updateData.image_type = image_type;
    if (license !== undefined) updateData.license = license;
    if (license_details !== undefined) updateData.license_details = license_details;
    
    const image = await ImageModel.update(id, updateData);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const image = await ImageModel.findById(id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const deleted = await ImageModel.delete(id);
    
    if (deleted) {
      try {
        fs.unlinkSync(image.file_path);
      } catch (err) {
        console.warn('Failed to delete file:', image.file_path);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.post('/:id/associate/:questionId', async (req: Request, res: Response) => {
  try {
    const imageId = parseInt(req.params.id);
    const questionId = parseInt(req.params.questionId);
    const displayOrder = parseInt(req.body.display_order) || 1;
    const usageType = req.body.usage_type || 'question';
    
    console.log('Associating image with question:', {
      imageId,
      questionId,
      displayOrder,
      usageType
    });
    
    const association = await ImageModel.associateWithQuestion(questionId, imageId, displayOrder, usageType);
    console.log('Association created:', association);
    res.status(201).json(association);
  } catch (error) {
    console.error('Associate image error:', error);
    res.status(500).json({ error: 'Failed to associate image with question' });
  }
});

router.put('/:id/usage/:questionId', async (req: Request, res: Response) => {
  try {
    const imageId = parseInt(req.params.id);
    const questionId = parseInt(req.params.questionId);
    const { usage_type } = req.body;
    
    if (!usage_type || !['question', 'explanation'].includes(usage_type)) {
      return res.status(400).json({ error: 'Invalid usage_type. Must be "question" or "explanation"' });
    }
    
    const updated = await ImageModel.updateImageUsage(questionId, imageId, usage_type);
    
    if (!updated) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Update image usage error:', error);
    res.status(500).json({ error: 'Failed to update image usage' });
  }
});

router.delete('/:id/associate/:questionId', async (req: Request, res: Response) => {
  try {
    const imageId = parseInt(req.params.id);
    const questionId = parseInt(req.params.questionId);
    
    const removed = await ImageModel.removeFromQuestion(questionId, imageId);
    
    if (!removed) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove association error:', error);
    res.status(500).json({ error: 'Failed to remove association' });
  }
});

router.get('/:id/questions', async (req: Request, res: Response) => {
  try {
    const imageId = parseInt(req.params.id);
    const questions = await ImageModel.findQuestionsForImage(imageId);
    res.json(questions);
  } catch (error) {
    console.error('Get questions for image error:', error);
    res.status(500).json({ error: 'Failed to fetch questions for image' });
  }
});


router.get('/serve/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../../uploads/images', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Get user's contribution stats
router.get('/user/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const imageCount = await ImageModel.countByUser(userId);
    
    // Import ImageDescriptionModel here to avoid circular dependencies
    const { ImageDescriptionModel } = require('../models/ImageDescription');
    const descriptionCount = await ImageDescriptionModel.countByUser(userId);
    
    const totalContributions = imageCount + descriptionCount;
    const limit = 20;
    const remaining = Math.max(0, limit - totalContributions);
    
    const isLimited = req.user.is_image_contributor && !req.user.is_admin && !req.user.is_reviewer;
    
    res.json({
      user: {
        id: userId,
        username: req.user.username,
        is_image_contributor: req.user.is_image_contributor,
        is_admin: req.user.is_admin,
        is_reviewer: req.user.is_reviewer
      },
      stats: {
        images_uploaded: imageCount,
        descriptions_created: descriptionCount,
        total_contributions: totalContributions,
        limit: isLimited ? limit : null,
        remaining: isLimited ? remaining : null,
        is_limited: isLimited,
        at_limit: isLimited && totalContributions >= limit
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;