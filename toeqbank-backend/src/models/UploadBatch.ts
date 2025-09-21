import { query } from './database';

export interface UploadBatch {
  id?: number;
  batch_name?: string;
  uploaded_by?: number;
  upload_date?: Date;
  question_count?: number;
  file_name?: string;
  description?: string;
  isbn?: string;
  starting_page?: number;
  ending_page?: number;
  chapter?: string;
  uploader_username?: string;
}

export class UploadBatchModel {
  static async create(batchData: Omit<UploadBatch, 'id' | 'upload_date'>): Promise<UploadBatch> {
    const sql = `
      INSERT INTO upload_batches (batch_name, uploaded_by, question_count, file_name, description, isbn, starting_page, ending_page, chapter)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      batchData.batch_name,
      batchData.uploaded_by,
      batchData.question_count || 0,
      batchData.file_name,
      batchData.description,
      batchData.isbn,
      batchData.starting_page,
      batchData.ending_page,
      batchData.chapter
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async getAll(): Promise<UploadBatch[]> {
    const sql = `
      SELECT 
        ub.*,
        u.username as uploader_username,
        COUNT(DISTINCT q.id) as actual_question_count,
        COUNT(DISTINCT imgd.id) as image_description_count
      FROM upload_batches ub
      LEFT JOIN users u ON u.id = ub.uploaded_by
      LEFT JOIN questions q ON q.batch_id = ub.id
      LEFT JOIN image_descriptions imgd ON imgd.question_id = q.id
      GROUP BY ub.id, u.username
      HAVING COUNT(q.id) > 0
      ORDER BY ub.upload_date DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  static async getById(id: number): Promise<UploadBatch | null> {
    const sql = `
      SELECT 
        ub.*,
        u.username as uploader_username,
        COUNT(DISTINCT q.id) as actual_question_count,
        COUNT(DISTINCT imgd.id) as image_description_count
      FROM upload_batches ub
      LEFT JOIN users u ON u.id = ub.uploaded_by
      LEFT JOIN questions q ON q.batch_id = ub.id
      LEFT JOIN image_descriptions imgd ON imgd.question_id = q.id
      WHERE ub.id = $1
      GROUP BY ub.id, u.username
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    // Delete questions first (cascade should handle this, but let's be explicit)
    const deleteQuestionsSql = 'DELETE FROM questions WHERE batch_id = $1';
    await query(deleteQuestionsSql, [id]);
    
    // Delete the batch
    const deleteBatchSql = 'DELETE FROM upload_batches WHERE id = $1';
    const result = await query(deleteBatchSql, [id]);
    return result.rowCount > 0;
  }

  static async getQuestionsByBatchId(batchId: number): Promise<any[]> {
    const sql = `
      SELECT 
        q.*,
        CASE 
          WHEN q.review_status = 'pending' THEN 'Ready for Review'
          WHEN q.review_status = 'approved' THEN 'Approved'
          WHEN q.review_status = 'rejected' THEN 'Rejected'
          WHEN q.review_status = 'returned' THEN 'Needs Rework'
          ELSE q.review_status
        END as status_display
      FROM questions q
      WHERE q.batch_id = $1
      ORDER BY 
        CASE 
          WHEN q.question_number IS NULL THEN 0
          WHEN q.question_number ~ '^Q?[0-9]+$' THEN CAST(REGEXP_REPLACE(q.question_number, '^Q', '') AS INTEGER)
          ELSE 0
        END DESC,
        q.created_at DESC
    `;
    const result = await query(sql, [batchId]);
    return result.rows;
  }

  static async updateQuestionCount(batchId: number, count: number): Promise<void> {
    const sql = 'UPDATE upload_batches SET question_count = $1 WHERE id = $2';
    await query(sql, [count, batchId]);
  }
}