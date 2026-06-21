-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT UNIQUE,
    display_name TEXT,
    age INT,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te')),
    pcos_diagnosed BOOLEAN DEFAULT FALSE,
    diagnosis_year INT,
    goals TEXT[],
    avatar_url TEXT,
    expo_push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- SYMPTOM LOGS
CREATE TABLE IF NOT EXISTS public.symptom_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
    mood INT CHECK (mood BETWEEN 1 AND 5),
    pain_level INT CHECK (pain_level BETWEEN 1 AND 5),
    acne BOOLEAN DEFAULT FALSE,
    hair_loss BOOLEAN DEFAULT FALSE,
    bloating BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, date)
);

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own symptom logs"
    ON public.symptom_logs FOR ALL
    USING (auth.uid() = user_id);


-- CYCLE LOGS
CREATE TABLE IF NOT EXISTS public.cycle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE,
    flow_intensity TEXT CHECK (flow_intensity IN ('light', 'medium', 'heavy')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cycle logs"
    ON public.cycle_logs FOR ALL
    USING (auth.uid() = user_id);


-- WEIGHT LOGS
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, date)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own weight logs"
    ON public.weight_logs FOR ALL
    USING (auth.uid() = user_id);


-- MEAL PLANS
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    language TEXT CHECK (language IN ('en', 'hi', 'te')),
    region TEXT CHECK (region IN ('south_indian', 'north_indian', 'general')),
    plan_data JSONB NOT NULL,
    generated_by_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal plans"
    ON public.meal_plans FOR ALL
    USING (auth.uid() = user_id);


-- LAB REPORTS
CREATE TABLE IF NOT EXISTS public.lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    report_date DATE DEFAULT CURRENT_DATE,
    ai_analysis TEXT,
    extracted_values JSONB,
    language TEXT CHECK (language IN ('en', 'hi', 'te')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lab reports"
    ON public.lab_reports FOR ALL
    USING (auth.uid() = user_id);


-- COMMUNITY POSTS
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te')),
    category TEXT CHECK (category IN ('general', 'diet', 'fitness', 'mental', 'cycles')),
    is_anonymous BOOLEAN DEFAULT FALSE,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    is_moderated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community posts are viewable by everyone"
    ON public.community_posts FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can insert posts"
    ON public.community_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
    ON public.community_posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
    ON public.community_posts FOR DELETE
    USING (auth.uid() = user_id);


-- COMMUNITY COMMENTS
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te')),
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_moderated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
    ON public.community_comments FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can insert comments"
    ON public.community_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete/update their own comments"
    ON public.community_comments FOR ALL
    USING (auth.uid() = user_id);


-- COMMUNITY LIKES
CREATE TABLE IF NOT EXISTS public.community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (post_id, user_id)
);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
    ON public.community_likes FOR SELECT
    USING (TRUE);

CREATE POLICY "Users can like/unlike posts"
    ON public.community_likes FOR ALL
    USING (auth.uid() = user_id);


-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    language TEXT CHECK (language IN ('en', 'hi', 'te')),
    agent_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat history"
    ON public.chat_messages FOR ALL
    USING (auth.uid() = user_id);


-- NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
    ON public.notification_logs FOR SELECT
    USING (auth.uid() = user_id);


-- Realtime PubSub Setup for Community Feed
-- Enable realtime updates on community tables
alter publication supabase_realtime add table public.community_posts;
alter publication supabase_realtime add table public.community_comments;
alter publication supabase_realtime add table public.community_likes;
