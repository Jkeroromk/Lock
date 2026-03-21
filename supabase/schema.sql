-- 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  height INTEGER, -- 身高 (cm)
  age INTEGER, -- 年龄
  weight DECIMAL(5, 2), -- 体重 (kg)
  gender TEXT, -- 性别: male, female, other
  goal TEXT, -- 目标: lose_weight, lose_fat, gain_muscle
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 meals 表
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
  protein DECIMAL(10, 2) DEFAULT 0,
  carbs DECIMAL(10, 2) DEFAULT 0,
  fat DECIMAL(10, 2) DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 health_sync 表
CREATE TABLE IF NOT EXISTS health_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  active_energy DECIMAL(10, 2) DEFAULT 0,
  heart_rate INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at);
CREATE INDEX IF NOT EXISTS idx_health_sync_user_id ON health_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_health_sync_date ON health_sync(date);

-- 启用 Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 策略：基于 Supabase Auth 的 auth.uid() 进行数据隔离
-- 每个用户只能访问自己的数据
-- ============================================================

-- Users 表策略
-- 用户只能查看和更新自己的资料
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (id = auth.uid());

-- Meals 表策略
-- 用户只能操作自己的餐食记录
CREATE POLICY "meals_select_own" ON meals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "meals_insert_own" ON meals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "meals_update_own" ON meals
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "meals_delete_own" ON meals
  FOR DELETE USING (user_id = auth.uid());

-- Health Sync 表策略
-- 用户只能操作自己的健康数据
CREATE POLICY "health_sync_select_own" ON health_sync
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "health_sync_insert_own" ON health_sync
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "health_sync_update_own" ON health_sync
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "health_sync_delete_own" ON health_sync
  FOR DELETE USING (user_id = auth.uid());

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_sync_updated_at BEFORE UPDATE ON health_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
