import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { ImageModel } from '../models/Image';
import { requireAuth } from '../middleware/auth';
import { StorageService } from '../utils/storage';
import { query } from '../models/database';

const router = Router();

// Use memory storage since all uploads go to Spaces
const storage = multer.memoryStorage();

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
    
    // FORCE all uploads to DigitalOcean Spaces - no local storage fallback
    if (!StorageService.isConfigured()) {
      return res.status(500).json({ 
        error: 'Storage service not configured', 
        message: 'DigitalOcean Spaces configuration is required for file uploads'
      });
    }

    let finalFilename: string;
    let finalFilePath: string;
    let publicUrl: string;

    try {
      console.log('Uploading to DigitalOcean Spaces...');
      const uploadResult = await StorageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      
      finalFilename = uploadResult.filename;
      finalFilePath = uploadResult.url; // Store the Spaces URL as file_path
      publicUrl = uploadResult.url;
      
      console.log('Spaces upload successful:', publicUrl);
    } catch (spacesError) {
      console.error('Spaces upload failed:', spacesError);
      return res.status(500).json({ 
        error: 'Failed to upload to DigitalOcean Spaces', 
        details: spacesError instanceof Error ? spacesError.message : 'Unknown error'
      });
    }

    const imageData = {
      filename: finalFilename,
      original_name: req.file.originalname,
      file_path: finalFilePath,
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
      uploaded_by: req.user.id,
      exam_category: req.user.exam_category,
      exam_type: req.user.exam_type
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
    const imageType = image_type || (mimetype.startsWith('video/') ? 'cine' : 'still');

    // FORCE all uploads to DigitalOcean Spaces - no local storage fallback
    if (!StorageService.isConfigured()) {
      return res.status(500).json({ 
        error: 'Storage service not configured', 
        message: 'DigitalOcean Spaces configuration is required for file uploads'
      });
    }

    let finalFilename: string;
    let finalFilePath: string;
    let publicUrl: string;

    try {
      console.log('Uploading downloaded image to DigitalOcean Spaces...');
      const uploadResult = await StorageService.uploadFile(buffer, filename, mimetype);
      
      finalFilename = uploadResult.filename;
      finalFilePath = uploadResult.url; // Store the Spaces URL as file_path
      publicUrl = uploadResult.url;
      
      console.log('Spaces upload successful:', publicUrl);
    } catch (spacesError) {
      console.error('Spaces upload failed:', spacesError);
      return res.status(500).json({ 
        error: 'Failed to upload to DigitalOcean Spaces', 
        details: spacesError instanceof Error ? spacesError.message : 'Unknown error'
      });
    }
    
    const imageData = {
      filename: finalFilename,
      original_name: filename,
      file_path: finalFilePath,
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
      uploaded_by: req.user.id,
      exam_category: req.user.exam_category,
      exam_type: req.user.exam_type
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
      
      // Delete from Spaces if database save failed
      try {
        await StorageService.deleteFile(finalFilename);
        console.log('Cleaned up Spaces file after database error:', finalFilename);
      } catch (cleanupError) {
        console.error('Failed to clean up Spaces file:', cleanupError);
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

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const imageType = req.query.type as 'still' | 'cine' | undefined;
    const license = req.query.license as any;
    const tags = req.query.tags as string;
    const uploadedBy = req.query.uploaded_by ? parseInt(req.query.uploaded_by as string) : undefined;

    // Get user's exam category and type from req.user
    const user = (req as any).user;
    const examCategory = user?.exam_category;
    const examType = user?.exam_type;

    // User MUST have exam settings for content filtering
    if (!examCategory || !examType) {
      console.error('User missing exam settings:', { userId: user?.id, username: user?.username });
      return res.status(400).json({ 
        error: 'User exam settings not configured',
        message: 'Please configure your exam preferences in settings'
      });
    }

    // ALWAYS filter by exam - this is critical for content segregation
    let images;
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      // Need to update findByTags to support exam filtering
      const sql = `
        SELECT i.*, 
               EXISTS(SELECT 1 FROM question_images qi WHERE qi.image_id = i.id) as has_questions
        FROM images i
        WHERE i.tags && $1::text[]
        AND i.exam_category = $2
        AND i.exam_type = $3
        ORDER BY i.created_at DESC 
        LIMIT $4 OFFSET $5
      `;
      const result = await query(sql, [tagArray, examCategory, examType, limit, offset]);
      images = result.rows;
    } else {
      // Modified to include has_questions flag
      const sql = `
        SELECT i.*, 
               EXISTS(SELECT 1 FROM question_images qi WHERE qi.image_id = i.id) as has_questions
        FROM images i
        WHERE ($1::text IS NULL OR i.image_type = $1)
        AND ($2::text IS NULL OR i.license = $2)
        AND ($3::int IS NULL OR i.uploaded_by = $3)
        AND i.exam_category = $4
        AND i.exam_type = $5
        ORDER BY i.created_at DESC
        LIMIT $6 OFFSET $7
      `;
      const result = await query(sql, [imageType, license, uploadedBy, examCategory, examType, limit, offset]);
      images = result.rows;
    }

    const totalCount = await ImageModel.getCount(imageType, license, uploadedBy, examCategory, examType);
    
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

    // Get optional uploaded_by filter from query parameters
    const uploadedBy = req.query.uploaded_by ? parseInt(req.query.uploaded_by as string) : undefined;
    
    // Get next unreviewed image with optional user filter
    const nextImage = await ImageModel.getNextForReview(uploadedBy);
    
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

// Get users who have uploaded images (for admin filtering)
router.get('/uploaders', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only allow admins to access this endpoint
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const uploaders = await ImageModel.getImageUploaders();
    res.json(uploaders);
  } catch (error) {
    console.error('Get image uploaders error:', error);
    res.status(500).json({ error: 'Failed to fetch image uploaders' });
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
    const { description, tags, image_type, license, license_details, review_rating } = req.body;
    
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }
    if (image_type !== undefined) updateData.image_type = image_type;
    if (license !== undefined) updateData.license = license;
    if (license_details !== undefined) updateData.license_details = license_details;
    if (review_rating !== undefined) updateData.review_rating = review_rating;
    
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
      // Delete from Spaces if it's a Spaces URL, otherwise try local cleanup for legacy files
      if (image.file_path.startsWith('http')) {
        try {
          await StorageService.deleteFile(image.filename);
          console.log('Deleted file from Spaces:', image.filename);
        } catch (err) {
          console.warn('Failed to delete Spaces file:', image.filename, err);
        }
      } else {
        // Legacy local files - attempt local cleanup
        try {
          fs.unlinkSync(image.file_path);
          console.log('Deleted legacy local file:', image.file_path);
        } catch (err) {
          console.warn('Failed to delete legacy local file:', image.file_path);
        }
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


// Legacy endpoint for local file serving - redirect to Spaces
router.get('/serve/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    // Check if it's a legacy local file first
    const filepath = path.join(__dirname, '../../uploads/images', filename);
    if (fs.existsSync(filepath)) {
      console.log('Serving legacy local file:', filename);
      return res.sendFile(path.resolve(filepath));
    }
    
    // Redirect to Spaces URL for new files
    const spacesUrl = StorageService.getPublicUrl(filename);
    console.log('Redirecting to Spaces URL:', spacesUrl);
    res.redirect(302, spacesUrl);
    
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