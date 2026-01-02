// =====================================================
// ADMIN USER FUNCTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import type { AdminUser, AdminRole } from './types';

export async function getAdminUser(adminId: string): Promise<AdminUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', adminId)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createAdminUser(
  admin: { email: string; name: string; role: AdminRole; password: string }
): Promise<AdminUser> {
  const supabase = await createClient();

  // Hash password (use bcrypt in production)
  const passwordHash = crypto.createHash('sha256').update(admin.password).digest('hex');

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: admin.email.toLowerCase(),
      name: admin.name,
      role: admin.role,
      password_hash: passwordHash,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminId);
}
