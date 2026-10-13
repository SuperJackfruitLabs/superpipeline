-- The agent's display role ("Diagnostics"), shown beside its name on a card. Optional; null reads as "agent".
ALTER TABLE agents ADD COLUMN role TEXT;
