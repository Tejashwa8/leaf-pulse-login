-- Diagnoses table
CREATE TABLE public.diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_hash TEXT,
  disease_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  rx TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnoses_user_created ON public.diagnoses(user_id, created_at DESC);
CREATE INDEX idx_diagnoses_user_hash ON public.diagnoses(user_id, image_hash);

ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diagnoses"
  ON public.diagnoses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own diagnoses"
  ON public.diagnoses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own diagnoses"
  ON public.diagnoses FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for leaf images (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('leaf-images', 'leaf-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own leaf images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'leaf-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own leaf images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'leaf-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own leaf images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'leaf-images' AND auth.uid()::text = (storage.foldername(name))[1]);