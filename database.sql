CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  festival VARCHAR(255) NOT NULL,
  plan VARCHAR(255) NOT NULL,
  arrival_date DATE NULL,
  nights INT NOT NULL,
  guests INT NOT NULL,
  dinner_included TINYINT(1) NOT NULL DEFAULT 0,
  base_amount INT NOT NULL,
  dinner_amount INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  invoice_path VARCHAR(255) NOT NULL,
  invoice_data LONGBLOB NULL,
  invoice_content_type VARCHAR(64) NULL,
  deleted_at DATETIME NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'website',
  referral_code VARCHAR(64) NULL,
  INDEX bookings_referral_code (referral_code)
);

CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  subject VARCHAR(255) NULL,
  message TEXT NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'website'
);

CREATE TABLE IF NOT EXISTS booking_operations (
  booking_reference VARCHAR(40) PRIMARY KEY,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  full_address TEXT NULL,
  email VARCHAR(255) NULL,
  tent_number VARCHAR(64) NULL,
  rate_per_night INT NULL,
  stay_amount INT NULL,
  pickup_required TINYINT(1) NOT NULL DEFAULT 0,
  pickup_point VARCHAR(255) NULL,
  pickup_date DATE NULL,
  pickup_time VARCHAR(5) NULL,
  drop_required TINYINT(1) NOT NULL DEFAULT 0,
  drop_point VARCHAR(255) NULL,
  drop_date DATE NULL,
  drop_time VARCHAR(5) NULL,
  transport_amount INT NOT NULL DEFAULT 0,
  meal_preference VARCHAR(64) NULL,
  lunch_qty_per_day INT NOT NULL DEFAULT 0,
  dinner_qty_per_day INT NOT NULL DEFAULT 0,
  meal_amount INT NOT NULL DEFAULT 0,
  advance_paid INT NOT NULL DEFAULT 0,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
  booking_source VARCHAR(128) NULL,
  id_proof_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  special_requests TEXT NULL,
  assigned_staff VARCHAR(255) NULL,
  internal_notes TEXT NULL,
  INDEX booking_operations_payment_status (payment_status),
  INDEX booking_operations_staff (assigned_staff)
);

CREATE TABLE IF NOT EXISTS contest_entries (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  instagram_url VARCHAR(1000) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'website'
);

CREATE TABLE IF NOT EXISTS lucky_entries (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  booking_reference VARCHAR(40) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'website'
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  source VARCHAR(64) NOT NULL DEFAULT 'manual',
  source_reference VARCHAR(64) NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  subject VARCHAR(255) NULL,
  notes TEXT NULL,
  booking_reference VARCHAR(40) NULL,
  next_follow_up_at DATETIME NULL,
  quoted_price INT NULL,
  deleted_at DATETIME NULL,
  INDEX leads_status_updated (status, updated_at),
  INDEX leads_follow_up (next_follow_up_at)
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id VARCHAR(40) PRIMARY KEY,
  lead_id VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activity_type VARCHAR(32) NOT NULL DEFAULT 'note',
  note TEXT NOT NULL,
  INDEX lead_activities_lead_created (lead_id, created_at)
);

CREATE TABLE IF NOT EXISTS tent_units (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  tent_code VARCHAR(64) NOT NULL UNIQUE,
  tent_type VARCHAR(64) NOT NULL,
  capacity INT NOT NULL,
  operational_status VARCHAR(32) NOT NULL DEFAULT 'available',
  notes TEXT NULL,
  INDEX tent_units_type_status (tent_type, operational_status)
);

CREATE TABLE IF NOT EXISTS tent_allocations (
  id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  booking_reference VARCHAR(40) NOT NULL,
  tent_id VARCHAR(40) NOT NULL,
  guest_count INT NOT NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  allocation_status VARCHAR(32) NOT NULL DEFAULT 'reserved',
  notes TEXT NULL,
  INDEX tent_allocations_booking (booking_reference),
  INDEX tent_allocations_tent_dates (tent_id, arrival_date, departure_date),
  INDEX tent_allocations_status (allocation_status)
);

CREATE TABLE IF NOT EXISTS storage_migrations (
  name VARCHAR(128) PRIMARY KEY,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
