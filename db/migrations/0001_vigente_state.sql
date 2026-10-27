CREATE TABLE IF NOT EXISTS vigente_state (
  id text PRIMARY KEY,
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  version bigint NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vigente_state_singleton CHECK (id = 'main')
);

CREATE INDEX IF NOT EXISTS vigente_state_updated_at_idx
  ON vigente_state (updated_at DESC);
