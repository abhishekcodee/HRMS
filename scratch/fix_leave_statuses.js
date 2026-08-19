const { pool } = require('../backend/dist/database/index.js');

async function fixLeaveData() {
  const [rows] = await pool.query('SELECT lr.id, lr.employer_status, lr.admin_status, lr.status FROM leave_requests lr');
  for (const r of rows) {
    let correctStatus = 'PENDING';
    if (r.employer_status === 'APPROVED' || r.admin_status === 'APPROVED') {
      correctStatus = 'APPROVED';
    } else if (r.employer_status === 'REJECTED' || r.admin_status === 'REJECTED') {
      correctStatus = 'REJECTED';
    }
    await pool.query('UPDATE leave_requests SET status = ? WHERE id = ?', [correctStatus, r.id]);
  }

  // Update seed default matching status for Rajesh Kumar (make admin_status match status)
  await pool.query("UPDATE leave_requests SET admin_status = 'REJECTED', status = 'REJECTED' WHERE id = '7e705169-0dbc-4722-8663-b55e6d1c97f0'");
  await pool.query("UPDATE leave_requests SET admin_status = 'PENDING', status = 'PENDING' WHERE id = 'b0dca453-454c-4c35-bf46-4de24f8393f0'");

  const [updated] = await pool.query('SELECT lr.id, u.full_name, lr.employer_status, lr.admin_status, lr.status FROM leave_requests lr JOIN users u ON u.id = lr.user_id');
  console.log('Fixed Database Leave Records:\n', JSON.stringify(updated, null, 2));

  await pool.query(`
    UPDATE leave_balances lb
    SET used_days = (
      SELECT COALESCE(SUM(days_count), 0)
      FROM leave_requests
      WHERE user_id = lb.user_id AND leave_type = lb.leave_type AND status = 'APPROVED'
    )
  `);
  console.log('Recalculated all user leave balances!');
  await pool.end();
}

fixLeaveData();
