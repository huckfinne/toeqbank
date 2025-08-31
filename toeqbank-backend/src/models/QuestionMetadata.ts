import { query } from './database';

export interface QuestionMetadata {
  id?: number;
  question_id: number;
  difficulty?: string;
  category?: string;
  topic?: string;
  keywords?: string[];
  question_type?: string;
  view_type?: string;
  major_structures?: string[];
  minor_structures?: string[];
  modalities?: string[];
  created_at?: string;
  updated_at?: string;
}

export class QuestionMetadataModel {
  static async create(metadata: Omit<QuestionMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<QuestionMetadata> {
    const result = await query(`
      INSERT INTO question_metadata (
        question_id, difficulty, category, topic, keywords, 
        question_type, view_type, major_structures, minor_structures, modalities
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (question_id) 
      DO UPDATE SET 
        difficulty = EXCLUDED.difficulty,
        category = EXCLUDED.category,
        topic = EXCLUDED.topic,
        keywords = EXCLUDED.keywords,
        question_type = EXCLUDED.question_type,
        view_type = EXCLUDED.view_type,
        major_structures = EXCLUDED.major_structures,
        minor_structures = EXCLUDED.minor_structures,
        modalities = EXCLUDED.modalities,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      metadata.question_id,
      metadata.difficulty,
      metadata.category,
      metadata.topic,
      metadata.keywords,
      metadata.question_type,
      metadata.view_type,
      metadata.major_structures,
      metadata.minor_structures,
      metadata.modalities
    ]);
    
    return result.rows[0];
  }

  static async findByQuestionId(questionId: number): Promise<QuestionMetadata | null> {
    const result = await query('SELECT * FROM question_metadata WHERE question_id = $1', [questionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  static async update(questionId: number, data: Partial<Omit<QuestionMetadata, 'id' | 'question_id' | 'created_at' | 'updated_at'>>): Promise<QuestionMetadata> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex++}`);
      values.push(data.difficulty);
    }
    
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    
    if (data.topic !== undefined) {
      updates.push(`topic = $${paramIndex++}`);
      values.push(data.topic);
    }
    
    if (data.keywords !== undefined) {
      updates.push(`keywords = $${paramIndex++}`);
      values.push(data.keywords);
    }
    
    if (data.question_type !== undefined) {
      updates.push(`question_type = $${paramIndex++}`);
      values.push(data.question_type);
    }
    
    if (data.view_type !== undefined) {
      updates.push(`view_type = $${paramIndex++}`);
      values.push(data.view_type);
    }
    
    if (data.major_structures !== undefined) {
      updates.push(`major_structures = $${paramIndex++}`);
      values.push(data.major_structures);
    }
    
    if (data.minor_structures !== undefined) {
      updates.push(`minor_structures = $${paramIndex++}`);
      values.push(data.minor_structures);
    }
    
    if (data.modalities !== undefined) {
      updates.push(`modalities = $${paramIndex++}`);
      values.push(data.modalities);
    }
    
    if (updates.length === 0) {
      return this.findByQuestionId(questionId) as Promise<QuestionMetadata>;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(questionId);
    
    const result = await query(`
      UPDATE question_metadata 
      SET ${updates.join(', ')} 
      WHERE question_id = $${paramIndex}
      RETURNING *
    `, values);
    
    return result.rows[0];
  }

  static async delete(questionId: number): Promise<boolean> {
    const result = await query('DELETE FROM question_metadata WHERE question_id = $1', [questionId]);
    return result.rowCount > 0;
  }
}