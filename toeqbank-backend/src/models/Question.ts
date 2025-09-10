import { query } from './database';

export interface Question {
  id?: number;
  question_number?: string;
  question: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  choice_e?: string;
  choice_f?: string;
  choice_g?: string;
  correct_answer: string;
  explanation?: string;
  source_folder?: string;
  review_status?: 'pending' | 'approved' | 'rejected' | 'returned';
  review_notes?: string;
  reviewed_by?: number;
  reviewed_at?: Date;
  uploaded_by?: number;
  batch_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class QuestionModel {
  static async create(questionData: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'>): Promise<Question> {
    const sql = `
      INSERT INTO questions (question, choice_a, choice_b, choice_c, choice_d, choice_e, choice_f, choice_g, correct_answer, explanation, source_folder, review_status, review_notes, uploaded_by, batch_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      questionData.question,
      questionData.choice_a,
      questionData.choice_b,
      questionData.choice_c,
      questionData.choice_d,
      questionData.choice_e,
      questionData.choice_f,
      questionData.choice_g,
      questionData.correct_answer,
      questionData.explanation,
      questionData.source_folder,
      questionData.review_status || 'pending',
      questionData.review_notes || null,
      questionData.uploaded_by || null,
      questionData.batch_id || null
    ];
    
    const result = await query(sql, values);
    const question = result.rows[0];
    
    // Auto-generate question number based on ID
    const questionNumber = `Q${question.id.toString().padStart(4, '0')}`;
    
    // Update the question with the generated number
    const updateSql = 'UPDATE questions SET question_number = $1 WHERE id = $2 RETURNING *';
    const updateResult = await query(updateSql, [questionNumber, question.id]);
    
    return updateResult.rows[0];
  }

  static async findAll(limit = 50, offset = 0): Promise<Question[]> {
    const sql = `
      SELECT * FROM questions 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  static async findById(id: number): Promise<Question | null> {
    const sql = 'SELECT * FROM questions WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  static async findBySourceFolder(sourceFolder: string): Promise<Question[]> {
    const sql = 'SELECT * FROM questions WHERE source_folder = $1 ORDER BY created_at DESC';
    const result = await query(sql, [sourceFolder]);
    return result.rows;
  }

  static async update(id: number, questionData: Partial<Question>): Promise<Question | null> {
    const fields = Object.keys(questionData).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return this.findById(id);
    }

    const sql = `
      UPDATE questions 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
    
    const values = [id, ...fields.map(field => questionData[field as keyof Question])];
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM questions WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  static async bulkCreate(questions: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'>[]): Promise<Question[]> {
    if (questions.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];
    
    questions.forEach((q, index) => {
      const offset = index * 15;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`);
      values.push(
        q.question,
        q.choice_a,
        q.choice_b,
        q.choice_c,
        q.choice_d,
        q.choice_e,
        q.choice_f,
        q.choice_g,
        q.correct_answer,
        q.explanation,
        q.source_folder,
        q.review_status || 'pending',
        q.review_notes || null,
        q.uploaded_by || null,
        q.batch_id || null
      );
    });

    const sql = `
      INSERT INTO questions (question, choice_a, choice_b, choice_c, choice_d, choice_e, choice_f, choice_g, correct_answer, explanation, source_folder, review_status, review_notes, uploaded_by, batch_id)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await query(sql, values);
    const createdQuestions = result.rows;
    
    // Auto-generate question numbers for all created questions
    const updatePromises = createdQuestions.map(async (question: Question) => {
      const questionNumber = `Q${question.id!.toString().padStart(4, '0')}`;
      const updateSql = 'UPDATE questions SET question_number = $1 WHERE id = $2 RETURNING *';
      const updateResult = await query(updateSql, [questionNumber, question.id]);
      return updateResult.rows[0];
    });
    
    return Promise.all(updatePromises);
  }

  static async getCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM questions';
    const result = await query(sql);
    return parseInt(result.rows[0].count);
  }

  // Review system methods
  static async getPendingReview(): Promise<Question[]> {
    const sql = `
      SELECT DISTINCT q.* 
      FROM questions q
      WHERE q.review_status = 'pending'
      AND (
        -- Questions with no image descriptions (don't need images)
        NOT EXISTS (
          SELECT 1 FROM image_descriptions id WHERE id.question_id = q.id
        )
        OR
        -- Questions where all image descriptions have been fulfilled with actual images
        NOT EXISTS (
          SELECT 1 FROM image_descriptions id 
          WHERE id.question_id = q.id 
          AND NOT EXISTS (
            SELECT 1 FROM question_images qi 
            WHERE qi.question_id = q.id 
            AND qi.usage_type = id.usage_type
          )
        )
      )
      ORDER BY q.created_at ASC
    `;
    const result = await query(sql);
    return result.rows;
  }

  static async getByReviewStatus(status: 'pending' | 'approved' | 'rejected' | 'returned'): Promise<Question[]> {
    const sql = 'SELECT * FROM questions WHERE review_status = $1 ORDER BY created_at DESC';
    const result = await query(sql, [status]);
    return result.rows;
  }

  static async updateReviewStatus(
    id: number, 
    status: 'pending' | 'approved' | 'rejected' | 'returned', 
    reviewNotes: string, 
    reviewerId: number
  ): Promise<Question | null> {
    const sql = `
      UPDATE questions 
      SET review_status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 
      RETURNING *
    `;
    const result = await query(sql, [status, reviewNotes, reviewerId, id]);
    return result.rows[0] || null;
  }

  static async getByUploader(uploaderId: number): Promise<Question[]> {
    const sql = `
      SELECT q.*, u.username as uploader_name
      FROM questions q
      LEFT JOIN users u ON u.id = q.uploaded_by
      WHERE q.uploaded_by = $1
      ORDER BY q.created_at DESC
    `;
    const result = await query(sql, [uploaderId]);
    return result.rows;
  }

  static async getReturnedForUploader(uploaderId: number): Promise<Question[]> {
    const sql = `
      SELECT q.*, u.username as uploader_name, r.username as reviewer_name
      FROM questions q
      LEFT JOIN users u ON u.id = q.uploaded_by
      LEFT JOIN users r ON r.id = q.reviewed_by
      WHERE q.uploaded_by = $1 AND q.review_status = 'returned'
      ORDER BY q.reviewed_at DESC
    `;
    const result = await query(sql, [uploaderId]);
    return result.rows;
  }

  static async getReviewStats(): Promise<{ total: number, pending: number, approved: number, rejected: number, returned: number }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN review_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN review_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN review_status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN review_status = 'returned' THEN 1 END) as returned
      FROM questions
    `;
    const result = await query(sql);
    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      approved: parseInt(stats.approved),
      rejected: parseInt(stats.rejected),
      returned: parseInt(stats.returned)
    };
  }
}