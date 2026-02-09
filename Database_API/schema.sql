-- Decentralized Voting System Database Schema

CREATE DATABASE IF NOT EXISTS voter_db;
USE voter_db;

-- Voters table
CREATE TABLE IF NOT EXISTS voters (
    voter_id VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    otp VARCHAR(10),
    otp_expiry DATETIME
);

-- Note: In a production environment, passwords should be hashed.
-- For this demo, we are using the existing plain text or existing format.
