import { supabase } from './supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: SupabaseUser;
  session?: Session;
}

/**
 * 邮箱密码注册
 */
export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    user: data.user ?? undefined,
    session: data.session ?? undefined,
  };
};

/**
 * 邮箱密码登录
 */
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    user: data.user ?? undefined,
    session: data.session ?? undefined,
  };
};

/**
 * 匿名登录（游客模式）
 */
export const signInAnonymously = async (): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    user: data.user ?? undefined,
    session: data.session ?? undefined,
  };
};

/**
 * 登出
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * 获取当前 session
 */
export const getSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/**
 * 获取当前 access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

/**
 * 发送密码重置邮件
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * 监听认证状态变化
 */
export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
};
