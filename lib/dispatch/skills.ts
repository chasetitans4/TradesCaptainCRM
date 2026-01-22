// =====================================================
// TECHNICIAN SKILLS MANAGEMENT
// Skills, certifications, and job requirements
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface SkillDefinition {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: string | null;
  requiresCertification: boolean;
  certificationExpiryDays: number | null;
  isActive: boolean;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
  certifiedAt: string | null;
  certificationExpiresAt: string | null;
  certificationNumber: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface JobTypeSkill {
  id: string;
  jobType: string;
  skillId: string;
  skillName: string;
  isRequired: boolean;
  minimumProficiency: number;
}

/**
 * Get all skill definitions for a business
 */
export async function getSkillDefinitions(businessId: string): Promise<SkillDefinition[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('skill_definitions')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('category')
    .order('name');

  return (data || []).map((s) => ({
    id: s.id,
    businessId: s.business_id,
    name: s.name,
    description: s.description,
    category: s.category,
    requiresCertification: s.requires_certification,
    certificationExpiryDays: s.certification_expiry_days,
    isActive: s.is_active,
  }));
}

/**
 * Create a skill definition
 */
export async function createSkillDefinition(
  businessId: string,
  data: {
    name: string;
    description?: string;
    category?: string;
    requiresCertification?: boolean;
    certificationExpiryDays?: number;
  }
): Promise<SkillDefinition> {
  const supabase = await createClient();

  const { data: skill, error } = await supabase
    .from('skill_definitions')
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      requires_certification: data.requiresCertification || false,
      certification_expiry_days: data.certificationExpiryDays || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: skill.id,
    businessId: skill.business_id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    requiresCertification: skill.requires_certification,
    certificationExpiryDays: skill.certification_expiry_days,
    isActive: skill.is_active,
  };
}

/**
 * Update a skill definition
 */
export async function updateSkillDefinition(
  skillId: string,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    requiresCertification: boolean;
    certificationExpiryDays: number;
    isActive: boolean;
  }>
): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.requiresCertification !== undefined) updateData.requires_certification = data.requiresCertification;
  if (data.certificationExpiryDays !== undefined) updateData.certification_expiry_days = data.certificationExpiryDays;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  await supabase.from('skill_definitions').update(updateData).eq('id', skillId);
}

/**
 * Get skills for a user
 */
export async function getUserSkills(userId: string): Promise<UserSkill[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skill_definitions(name)
    `)
    .eq('user_id', userId);

  return (data || []).map((us) => ({
    id: us.id,
    userId: us.user_id,
    skillId: us.skill_id,
    skillName: us.skill?.name || '',
    proficiencyLevel: us.proficiency_level,
    certifiedAt: us.certified_at,
    certificationExpiresAt: us.certification_expires_at,
    certificationNumber: us.certification_number,
    isVerified: us.is_verified,
    verifiedBy: us.verified_by,
    verifiedAt: us.verified_at,
  }));
}

/**
 * Add skill to a user
 */
export async function addUserSkill(
  userId: string,
  skillId: string,
  data?: {
    proficiencyLevel?: number;
    certifiedAt?: string;
    certificationExpiresAt?: string;
    certificationNumber?: string;
  }
): Promise<string> {
  const supabase = await createClient();

  const { data: skill, error } = await supabase
    .from('user_skills')
    .insert({
      user_id: userId,
      skill_id: skillId,
      proficiency_level: data?.proficiencyLevel || 3,
      certified_at: data?.certifiedAt || null,
      certification_expires_at: data?.certificationExpiresAt || null,
      certification_number: data?.certificationNumber || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('User already has this skill');
    }
    throw error;
  }

  return skill.id;
}

/**
 * Update user skill
 */
export async function updateUserSkill(
  userSkillId: string,
  data: Partial<{
    proficiencyLevel: number;
    certifiedAt: string;
    certificationExpiresAt: string;
    certificationNumber: string;
  }>
): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (data.proficiencyLevel !== undefined) updateData.proficiency_level = data.proficiencyLevel;
  if (data.certifiedAt !== undefined) updateData.certified_at = data.certifiedAt;
  if (data.certificationExpiresAt !== undefined) updateData.certification_expires_at = data.certificationExpiresAt;
  if (data.certificationNumber !== undefined) updateData.certification_number = data.certificationNumber;

  await supabase.from('user_skills').update(updateData).eq('id', userSkillId);
}

/**
 * Verify a user's skill
 */
export async function verifyUserSkill(
  userSkillId: string,
  verifiedBy: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('user_skills')
    .update({
      is_verified: true,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', userSkillId);
}

/**
 * Remove skill from user
 */
export async function removeUserSkill(userSkillId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('user_skills').delete().eq('id', userSkillId);
}

/**
 * Get skill requirements for a job type
 */
export async function getJobTypeSkills(
  businessId: string,
  jobType: string
): Promise<JobTypeSkill[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_type_skills')
    .select(`
      *,
      skill:skill_definitions(name)
    `)
    .eq('business_id', businessId)
    .eq('job_type', jobType);

  return (data || []).map((jts) => ({
    id: jts.id,
    jobType: jts.job_type,
    skillId: jts.skill_id,
    skillName: jts.skill?.name || '',
    isRequired: jts.is_required,
    minimumProficiency: jts.minimum_proficiency,
  }));
}

/**
 * Set skill requirements for a job type
 */
export async function setJobTypeSkill(
  businessId: string,
  jobType: string,
  skillId: string,
  data?: {
    isRequired?: boolean;
    minimumProficiency?: number;
  }
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('job_type_skills')
    .upsert(
      {
        business_id: businessId,
        job_type: jobType,
        skill_id: skillId,
        is_required: data?.isRequired !== false,
        minimum_proficiency: data?.minimumProficiency || 3,
      },
      { onConflict: 'business_id,job_type,skill_id' }
    );
}

/**
 * Remove skill requirement from job type
 */
export async function removeJobTypeSkill(
  businessId: string,
  jobType: string,
  skillId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('job_type_skills')
    .delete()
    .eq('business_id', businessId)
    .eq('job_type', jobType)
    .eq('skill_id', skillId);
}

/**
 * Check if user has required skills for a job type
 */
export async function checkUserSkillsForJobType(
  userId: string,
  businessId: string,
  jobType: string
): Promise<{
  qualified: boolean;
  missingRequired: string[];
  missingPreferred: string[];
  expiredCertifications: string[];
}> {
  const userSkills = await getUserSkills(userId);
  const jobSkills = await getJobTypeSkills(businessId, jobType);

  const userSkillMap = new Map(
    userSkills.map((s) => [
      s.skillId,
      {
        proficiency: s.proficiencyLevel,
        expires: s.certificationExpiresAt ? new Date(s.certificationExpiresAt) : null,
      },
    ])
  );

  const missingRequired: string[] = [];
  const missingPreferred: string[] = [];
  const expiredCertifications: string[] = [];

  const now = new Date();

  for (const req of jobSkills) {
    const userSkill = userSkillMap.get(req.skillId);

    if (!userSkill || userSkill.proficiency < req.minimumProficiency) {
      if (req.isRequired) {
        missingRequired.push(req.skillName);
      } else {
        missingPreferred.push(req.skillName);
      }
    } else if (userSkill.expires && userSkill.expires < now) {
      expiredCertifications.push(req.skillName);
      if (req.isRequired) {
        missingRequired.push(req.skillName);
      }
    }
  }

  return {
    qualified: missingRequired.length === 0,
    missingRequired,
    missingPreferred,
    expiredCertifications,
  };
}

/**
 * Get all job types with skill requirements
 */
export async function getJobTypesWithSkills(
  businessId: string
): Promise<{ jobType: string; skillCount: number }[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_type_skills')
    .select('job_type')
    .eq('business_id', businessId);

  const counts: Record<string, number> = {};
  for (const item of data || []) {
    counts[item.job_type] = (counts[item.job_type] || 0) + 1;
  }

  return Object.entries(counts).map(([jobType, skillCount]) => ({
    jobType,
    skillCount,
  }));
}

/**
 * Get technicians with expiring certifications
 */
export async function getExpiringCertifications(
  businessId: string,
  daysAhead: number = 30
): Promise<Array<{
  userId: string;
  userName: string;
  skillName: string;
  expiresAt: string;
  daysRemaining: number;
}>> {
  const supabase = await createClient();

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysAhead);

  const { data } = await supabase
    .from('user_skills')
    .select(`
      user_id,
      certification_expires_at,
      user:users!inner(name, business_id),
      skill:skill_definitions(name)
    `)
    .eq('user.business_id', businessId)
    .not('certification_expires_at', 'is', null)
    .lte('certification_expires_at', expiryDate.toISOString())
    .gte('certification_expires_at', new Date().toISOString());

  const results: Array<{
    userId: string;
    userName: string;
    skillName: string;
    expiresAt: string;
    daysRemaining: number;
  }> = [];

  for (const item of data || []) {
    const expiresAt = new Date(item.certification_expires_at);
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    results.push({
      userId: item.user_id,
      userName: (item.user as any)?.name || '',
      skillName: (item.skill as any)?.name || '',
      expiresAt: item.certification_expires_at,
      daysRemaining,
    });
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
