-- Add remision field to machine_transfers for shipment tracking
ALTER TABLE machine_transfers
ADD COLUMN remision TEXT NULL;
