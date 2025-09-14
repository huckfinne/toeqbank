import { query } from './database';

export type LicenseType = 
  | 'mit' 
  | 'apache-2.0' 
  | 'gpl-3.0' 
  | 'bsd-3-clause' 
  | 'cc0-1.0' 
  | 'cc-by-4.0' 
  | 'cc-by-sa-3.0'
  | 'cc-by-sa-4.0' 
  | 'cc-by-nc-4.0' 
  | 'cc-by-nc-sa-4.0'
  | 'copyright-borrowed' 
  | 'user-contributed';

export interface Image {
  id?: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  image_type: 'still' | 'cine';
  width?: number;
  height?: number;
  duration_seconds?: number;
  description?: string;
  tags?: string[];
  license: LicenseType;
  license_details?: string;
  source_url?: string;
  uploaded_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface QuestionImage {
  id?: number;
  question_id: number;
  image_id: number;
  display_order: number;
  usage_type: 'question' | 'explanation';
  created_at?: Date;
}

export class ImageModel {
  static async create(imageData: Omit<Image, 'id' | 'created_at' | 'updated_at'>): Promise<Image> {
    const sql = `
      INSERT INTO images (filename, original_name, file_path, file_size, mime_type, image_type, width, height, duration_seconds, description, tags, license, license_details, source_url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      imageData.filename,
      imageData.original_name,
      imageData.file_path,
      imageData.file_size,
      imageData.mime_type,
      imageData.image_type,
      imageData.width || null,
      imageData.height || null,
      imageData.duration_seconds || null,
      imageData.description || null,
      imageData.tags || [],  // Ensure tags is always an array
      imageData.license,
      imageData.license_details || null,
      imageData.source_url || null,
      imageData.uploaded_by || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0, imageType?: 'still' | 'cine', license?: LicenseType): Promise<Image[]> {
    let sql = `
      SELECT * FROM images 
      WHERE ($3::text IS NULL OR image_type = $3::text)
      AND ($4::text IS NULL OR license = $4::text)
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset, imageType, license]);
    return result.rows;
  }

  static async findById(id: number): Promise<Image | null> {
    const sql = 'SELECT * FROM images WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  static async findByTags(tags: string[], limit = 50, offset = 0): Promise<Image[]> {
    const sql = `
      SELECT * FROM images 
      WHERE tags && $1::text[]
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [tags, limit, offset]);
    return result.rows;
  }

  static async update(id: number, imageData: Partial<Image>): Promise<Image | null> {
    const fields = Object.keys(imageData).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return this.findById(id);
    }

    const sql = `
      UPDATE images 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
    
    const values = [id, ...fields.map(field => imageData[field as keyof Image])];
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM images WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  static async getCount(imageType?: 'still' | 'cine', license?: LicenseType): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count FROM images 
      WHERE ($1::text IS NULL OR image_type = $1::text)
      AND ($2::text IS NULL OR license = $2::text)
    `;
    const result = await query(sql, [imageType, license]);
    return parseInt(result.rows[0].count);
  }

  static async associateWithQuestion(questionId: number, imageId: number, displayOrder = 1, usageType: 'question' | 'explanation' = 'question'): Promise<QuestionImage> {
    const sql = `
      INSERT INTO question_images (question_id, image_id, display_order, usage_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (question_id, image_id) 
      DO UPDATE SET display_order = $3, usage_type = $4
      RETURNING *
    `;
    const result = await query(sql, [questionId, imageId, displayOrder, usageType]);
    return result.rows[0];
  }

  static async updateImageUsage(questionId: number, imageId: number, usageType: 'question' | 'explanation'): Promise<QuestionImage | null> {
    const sql = `
      UPDATE question_images 
      SET usage_type = $3 
      WHERE question_id = $1 AND image_id = $2 
      RETURNING *
    `;
    const result = await query(sql, [questionId, imageId, usageType]);
    return result.rows[0] || null;
  }

  static async removeFromQuestion(questionId: number, imageId: number): Promise<boolean> {
    const sql = 'DELETE FROM question_images WHERE question_id = $1 AND image_id = $2';
    const result = await query(sql, [questionId, imageId]);
    return result.rowCount > 0;
  }

  static async findByQuestionId(questionId: number): Promise<(Image & {usage_type?: 'question' | 'explanation'})[]> {
    const sql = `
      SELECT i.*, qi.display_order, COALESCE(qi.usage_type, 'question') as usage_type 
      FROM images i
      JOIN question_images qi ON i.id = qi.image_id
      WHERE qi.question_id = $1
      ORDER BY qi.display_order ASC, i.created_at ASC
    `;
    const result = await query(sql, [questionId]);
    return result.rows;
  }

  static async findQuestionsForImage(imageId: number): Promise<any[]> {
    const sql = `
      SELECT q.*, qi.display_order 
      FROM questions q
      JOIN question_images qi ON q.id = qi.question_id
      WHERE qi.image_id = $1
      ORDER BY qi.display_order ASC, q.created_at ASC
    `;
    const result = await query(sql, [imageId]);
    return result.rows;
  }

  static getLicenseInfo(license: LicenseType): { name: string; url?: string; requiresAttribution: boolean } {
    const licenses: Record<LicenseType, { name: string; url?: string; requiresAttribution: boolean }> = {
      'mit': { name: 'MIT License', url: 'https://opensource.org/licenses/MIT', requiresAttribution: true },
      'apache-2.0': { name: 'Apache License 2.0', url: 'https://opensource.org/licenses/Apache-2.0', requiresAttribution: true },
      'gpl-3.0': { name: 'GNU General Public License v3.0', url: 'https://opensource.org/licenses/GPL-3.0', requiresAttribution: true },
      'bsd-3-clause': { name: 'BSD 3-Clause License', url: 'https://opensource.org/licenses/BSD-3-Clause', requiresAttribution: true },
      'cc0-1.0': { name: 'Creative Commons Zero v1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false },
      'cc-by-4.0': { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true },
      'cc-by-sa-3.0': { name: 'Creative Commons Attribution-Share Alike 3.0 Unported', url: 'https://creativecommons.org/licenses/by-sa/3.0/', requiresAttribution: true },
      'cc-by-sa-4.0': { name: 'Creative Commons Attribution-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', requiresAttribution: true },
      'cc-by-nc-4.0': { name: 'Creative Commons Attribution-NonCommercial 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/', requiresAttribution: true },
      'cc-by-nc-sa-4.0': { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', requiresAttribution: true },
      'copyright-borrowed': { name: 'Copyright Borrowed', requiresAttribution: true },
      'user-contributed': { name: 'User Contributed', requiresAttribution: false }
    };
    return licenses[license];
  }

  static async countByUser(userId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM images WHERE uploaded_by = $1';
    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async findByUser(userId: number, limit = 50, offset = 0): Promise<Image[]> {
    const sql = `
      SELECT * FROM images 
      WHERE uploaded_by = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [userId, limit, offset]);
    return result.rows;
  }

  static async getContributorStats(userId: number): Promise<{
    total_images: number;
    total_descriptions: number;
    total_contributions: number;
    permitted_limit: number;
    remaining: number;
  }> {
    const imageCountSql = 'SELECT COUNT(*) as count FROM images WHERE uploaded_by = $1';
    const imageResult = await query(imageCountSql, [userId]);
    const imageCount = parseInt(imageResult.rows[0].count);

    const { ImageDescriptionModel } = require('./ImageDescription');
    const descriptionCount = await ImageDescriptionModel.countByUser(userId);
    
    const totalContributions = imageCount + descriptionCount;
    const limit = 20;
    const remaining = Math.max(0, limit - totalContributions);

    return {
      total_images: imageCount,
      total_descriptions: descriptionCount,
      total_contributions: totalContributions,
      permitted_limit: limit,
      remaining
    };
  }
}