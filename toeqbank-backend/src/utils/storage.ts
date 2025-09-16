import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

// DigitalOcean Spaces configuration
const spacesConfig = {
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  },
  forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
};

const s3Client = new S3Client(spacesConfig);

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'toeqbank-images';

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
}

export class StorageService {
  
  /**
   * Upload a file buffer to DigitalOcean Spaces
   */
  static async uploadFile(
    buffer: Buffer, 
    originalName: string, 
    mimeType: string
  ): Promise<UploadResult> {
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(originalName) || '.jpg';
    const filename = `toe_${uniqueSuffix}${extension}`;
    
    // Create the upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read' as const, // Make images publicly accessible
    };

    try {
      console.log('Uploading to Spaces:', filename);
      
      // Upload to DigitalOcean Spaces
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
      
      // Construct the public URL
      const url = `${spacesConfig.endpoint.replace('https://', `https://${BUCKET_NAME}.`)}/${filename}`;
      
      console.log('Upload successful:', url);
      
      return {
        filename,
        url,
        size: buffer.length
      };
      
    } catch (error) {
      console.error('Spaces upload error:', error);
      throw new Error(`Failed to upload to DigitalOcean Spaces: ${error}`);
    }
  }

  /**
   * Delete a file from DigitalOcean Spaces
   */
  static async deleteFile(filename: string): Promise<void> {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: filename,
    };

    try {
      const command = new DeleteObjectCommand(deleteParams);
      await s3Client.send(command);
      console.log('File deleted from Spaces:', filename);
    } catch (error) {
      console.error('Spaces delete error:', error);
      throw new Error(`Failed to delete from DigitalOcean Spaces: ${error}`);
    }
  }

  /**
   * Get the public URL for a file
   */
  static getPublicUrl(filename: string): string {
    return `${spacesConfig.endpoint.replace('https://', `https://${BUCKET_NAME}.`)}/${filename}`;
  }

  /**
   * Check if we should use Spaces (environment variables are configured)
   */
  static isConfigured(): boolean {
    return !!(
      process.env.DO_SPACES_KEY && 
      process.env.DO_SPACES_SECRET && 
      process.env.DO_SPACES_BUCKET
    );
  }
}