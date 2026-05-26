import { db } from "./openDBConnection.js";

export async function createTable() {
  // Create the table
  await db.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY,
            name VARCHAR UNIQUE,
            gender VARCHAR NOT NULL,
            gender_probability FLOAT NOT NULL,
            age INTEGER NOT NULL,
            age_group VARCHAR NOT NULL,
            country_id VARCHAR(2) NOT NULL,
            country_name VARCHAR NOT NULL,
            country_probability FLOAT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

  // Add column comments
  await db.query(`COMMENT ON COLUMN profiles.id IS 'Primary key'`);
  await db.query(`COMMENT ON COLUMN profiles.name IS 'Person''s full name'`);
  await db.query(`COMMENT ON COLUMN profiles.gender IS '"male" or "female"'`);
  await db.query(
    `COMMENT ON COLUMN profiles.gender_probability IS 'Confidence score'`,
  );
  await db.query(`COMMENT ON COLUMN profiles.age IS 'Exact age'`);
  await db.query(
    `COMMENT ON COLUMN profiles.age_group IS 'child, teenager, adult, senior'`,
  );
  await db.query(
    `COMMENT ON COLUMN profiles.country_id IS 'ISO code (NG, BJ, etc.)'`,
  );
  await db.query(
    `COMMENT ON COLUMN profiles.country_name IS 'Full country name'`,
  );
  await db.query(
    `COMMENT ON COLUMN profiles.country_probability IS 'Confidence score'`,
  );
  await db.query(`COMMENT ON COLUMN profiles.created_at IS 'Auto-generated'`);

  console.log("Profiles table has been created with comments");
}

export async function createUsersTable() {
  // Create the table
  await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            github_id VARCHAR UNIQUE,
            username VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            avatar_url VARCHAR NOT NULL,
            role VARCHAR NOT NULL CHECK (role IN ('admin', 'analyst')),
            is_active BOOLEAN NOT NULL,
            last_login_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

  console.log("Users table has been created with comments");
}

export async function indexTable() {
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_profiles_country_gender ON profiles(country_id, gender);`,
  );
}

// Execute the function only when running this file directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  createTable()
    .then(() => console.log("Done"))
    .catch((err) => console.error("Error creating table:", err.message));
}
