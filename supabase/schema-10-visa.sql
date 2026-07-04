-- Migration 10_visa_fields. Idempotent. Applied live via the MCP.
-- Extra visa-case fields the visa team tracks: arrival, and the medical
-- (health check-up) booking date + location.
alter table visa_cases add column if not exists arrival_date date;
alter table visa_cases add column if not exists medical_booked_date date;
alter table visa_cases add column if not exists medical_location text;
