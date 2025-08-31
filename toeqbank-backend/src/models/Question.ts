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
  created_at?: Date;
  updated_at?: Date;
}

export class QuestionModel {
  static async create(questionData: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'>): Promise<Question> {
    const sql = `
      INSERT INTO questions (question, choice_a, choice_b, choice_c, choice_d, choice_e, choice_f, choice_g, correct_answer, explanation, source_folder)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      questionData.source_folder
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
      const offset = index * 11;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`);
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
        q.source_folder
      );
    });

    const sql = `
      INSERT INTO questions (question, choice_a, choice_b, choice_c, choice_d, choice_e, choice_f, choice_g, correct_answer, explanation, source_folder)
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
}