const { pool } = require("./db");
async function check() {
    try {
        const query = `
            SELECT r.*, p.name as project_name 
            FROM test_reports r 
            LEFT JOIN test_projects p ON r.project_id = p.id
            ORDER BY r.created_at DESC 
            LIMIT 1
        `;
        const [rows] = await pool.query(query);
        console.log("Query Result:");
        console.log(JSON.stringify(rows[0], null, 2));
    } catch (e) {
        console.error("Query Error:", e);
    } finally {
        process.exit();
    }
}
check();
