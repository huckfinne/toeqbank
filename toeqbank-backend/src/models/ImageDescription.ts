import { query } from './database';

export interface ImageDescription {
  id?: number;
  question_id: number;
  description: string;
  usage_type: 'question' | 'explanation';
  modality?: 'transthoracic' | 'transesophageal' | 'non-echo';
  echo_view?: string;
  image_type?: 'still' | 'cine';
  created_at?: string;
  updated_at?: string;
}

export class ImageDescriptionModel {
  static async create(imageDescription: Omit<ImageDescription, 'id' | 'created_at' | 'updated_at'>): Promise<ImageDescription> {
    const result = await query(`
      INSERT INTO image_descriptions (question_id, description, usage_type, modality, echo_view, image_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      imageDescription.question_id,
      imageDescription.description,
      imageDescription.usage_type,
      imageDescription.modality || null,
      imageDescription.echo_view || null,
      imageDescription.image_type || 'still'
    ]);
    
    return result.rows[0];
  }

  static async findById(id: number): Promise<ImageDescription> {
    const result = await query('SELECT * FROM image_descriptions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`ImageDescription with id ${id} not found`);
    }
    
    return result.rows[0];
  }

  static async findAll(): Promise<ImageDescription[]> {
    const result = await query(`
      SELECT id.*, q.question_number, q.question 
      FROM image_descriptions id
      LEFT JOIN questions q ON id.question_id = q.id
      ORDER BY id.created_at DESC
    `);
    
    return result.rows;
  }

  static async findByQuestionId(questionId: number): Promise<ImageDescription[]> {
    const result = await query(`
      SELECT * FROM image_descriptions 
      WHERE question_id = $1 
      ORDER BY created_at ASC
    `, [questionId]);
    
    return result.rows;
  }

  static async findByQuestionIdAndUsageType(questionId: number, usageType: 'question' | 'explanation'): Promise<ImageDescription[]> {
    const result = await query(`
      SELECT * FROM image_descriptions 
      WHERE question_id = $1 AND usage_type = $2 
      ORDER BY created_at ASC
    `, [questionId, usageType]);
    
    return result.rows;
  }

  static async update(id: number, data: Partial<Pick<ImageDescription, 'description' | 'usage_type' | 'modality' | 'echo_view' | 'image_type'>>): Promise<ImageDescription> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    
    if (data.usage_type !== undefined) {
      updates.push(`usage_type = $${paramIndex++}`);
      values.push(data.usage_type);
    }
    
    if (data.modality !== undefined) {
      updates.push(`modality = $${paramIndex++}`);
      values.push(data.modality);
    }
    
    if (data.echo_view !== undefined) {
      updates.push(`echo_view = $${paramIndex++}`);
      values.push(data.echo_view);
    }
    
    if (data.image_type !== undefined) {
      updates.push(`image_type = $${paramIndex++}`);
      values.push(data.image_type);
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await query(`
      UPDATE image_descriptions 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    return result.rows[0];
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM image_descriptions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  static async deleteByQuestionId(questionId: number): Promise<number> {
    const result = await query('DELETE FROM image_descriptions WHERE question_id = $1', [questionId]);
    return result.rowCount;
  }

  static async getCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM image_descriptions');
    return parseInt(result.rows[0].count);
  }
}