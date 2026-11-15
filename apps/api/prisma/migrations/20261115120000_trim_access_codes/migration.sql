-- Access codes are trimmed on save and on entry; trim codes stored before that.
UPDATE "Contest"
SET "accessCode" = NULLIF(regexp_replace("accessCode", '^\s+|\s+$', '', 'g'), '')
WHERE "accessCode" ~ '^\s|\s$';

UPDATE "Album"
SET "accessCode" = NULLIF(regexp_replace("accessCode", '^\s+|\s+$', '', 'g'), '')
WHERE "accessCode" ~ '^\s|\s$';
