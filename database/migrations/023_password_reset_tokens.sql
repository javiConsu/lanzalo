-- Password reset tokens table
DROP TABLE IF EXISTS password_reset_tokens;
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
