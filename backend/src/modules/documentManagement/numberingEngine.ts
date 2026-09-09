import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Generate an atomic, sequential reference number based on company format pattern.
 */
export async function generateDocumentReferenceNumber(
  companyId: string,
  letterType: string,
  fallbackPrefix: string = 'DOC'
): Promise<string> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check letter_numbering format pattern for company
    const [rows]: any = await conn.query(
      `SELECT format_pattern, current_counter FROM letter_numbering 
       WHERE company_id = ? AND letter_type = ? FOR UPDATE`,
      [companyId, letterType]
    );

    let pattern = `${fallbackPrefix.toUpperCase()}/{FY}/{SEQ:0000}`;
    let counter = 1;

    if (rows.length > 0) {
      pattern = rows[0].format_pattern || pattern;
      counter = (rows[0].current_counter || 0) + 1;

      await conn.query(
        `UPDATE letter_numbering SET current_counter = ? WHERE company_id = ? AND letter_type = ?`,
        [counter, companyId, letterType]
      );
    } else {
      await conn.query(
        `INSERT INTO letter_numbering (id, company_id, letter_type, format_pattern, current_counter)
         VALUES (?, ?, ?, ?, 1)`,
        [uuidv4(), companyId, letterType, pattern]
      );
    }

    await conn.commit();

    // Format tokens
    const now = new Date();
    const year = now.getFullYear();
    const nextYearSuffix = String(year + 1).slice(-2);
    const fy = `${year}-${nextYearSuffix}`;
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Replace {SEQ:0000} or {SEQ:000000}
    let formatted = pattern
      .replace('{FY}', fy)
      .replace('{YEAR}', String(year))
      .replace('{MONTH}', month);

    formatted = formatted.replace(/\{SEQ:?(0+)?\}/g, (match, p1) => {
      const padding = p1 ? p1.length : 4;
      return String(counter).padStart(padding, '0');
    });

    return formatted;
  } catch (error) {
    await conn.rollback();
    logger.error('Failed to generate document reference number:', error);
    return `${fallbackPrefix}-${Date.now()}`;
  } finally {
    conn.release();
  }
}
