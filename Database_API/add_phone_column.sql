USE voting_db;
ALTER TABLE voters ADD COLUMN phone VARCHAR(20) AFTER email;
