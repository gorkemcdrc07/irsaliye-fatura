ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allowed_project_names text[] NOT NULL DEFAULT ARRAY[]::text[];
