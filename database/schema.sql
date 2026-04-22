-- ============================================================
-- LAYERLAB — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. User Profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Projects
-- ============================================================
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    graph_data JSONB DEFAULT '{"nodes":[],"edges":[]}',
    template TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Datasets
-- ============================================================
CREATE TABLE public.datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    file_type TEXT DEFAULT 'csv',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Training Jobs
-- ============================================================
CREATE TABLE public.training_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    config JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '[]',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Trained Models
-- ============================================================
CREATE TABLE public.models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    training_job_id UUID REFERENCES public.training_jobs(id),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    model_path TEXT,
    accuracy FLOAT,
    loss FLOAT,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. Deployments
-- ============================================================
CREATE TABLE public.deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID REFERENCES public.models(id),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    endpoint_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can manage own projects"
    ON public.projects FOR ALL
    USING (auth.uid() = user_id);

-- Datasets
CREATE POLICY "Users can manage own datasets"
    ON public.datasets FOR ALL
    USING (auth.uid() = user_id);

-- Training Jobs
CREATE POLICY "Users can manage own training jobs"
    ON public.training_jobs FOR ALL
    USING (auth.uid() = user_id);

-- Models
CREATE POLICY "Users can manage own models"
    ON public.models FOR ALL
    USING (auth.uid() = user_id);

-- Deployments
CREATE POLICY "Users can manage own deployments"
    ON public.deployments FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own datasets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'datasets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own datasets"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'datasets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own models"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'models'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own models"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'models'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_datasets_project_id ON public.datasets(project_id);
CREATE INDEX idx_training_jobs_project_id ON public.training_jobs(project_id);
CREATE INDEX idx_models_project_id ON public.models(project_id);
CREATE INDEX idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX idx_deployments_api_key ON public.deployments(api_key);
