import pool from '../config/database';

export interface RecruiterProfile {
  id: string;
  user_id: string;
  name: string | null;
  companyName: string | null;
  company_email: string | null;
  industry: string | null;
  description: string | null;
  company_size: string | null;
  logo_url: string | null;
  website: string | null;
  location: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export const RecruiterProfileModel = {
  async findByUserId(userId: string): Promise<RecruiterProfile | null> {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, company_name AS "companyName", company_email, industry, description, company_size, logo_url, website, location, is_verified, created_at, updated_at
       FROM recruiter_profiles WHERE user_id = $1`,
      [userId],
    );
    return rows[0] || null;
  },

  async create(userId: string): Promise<RecruiterProfile> {
    const { rows } = await pool.query(
      `INSERT INTO recruiter_profiles (user_id, updated_at) VALUES ($1, NOW()) RETURNING id, user_id, name, company_name AS "companyName", company_email, industry, description, company_size, logo_url, website, location, is_verified, created_at, updated_at`,
      [userId],
    );
    return rows[0];
  },

  async update(
    userId: string,
    data: Partial<Omit<RecruiterProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<RecruiterProfile> {
    // Map companyName back to company_name for the database update if present
    const dbData: Record<string, any> = { ...data };
    if ('companyName' in dbData) {
      dbData.company_name = dbData.companyName;
      delete dbData.companyName;
    }

    const fields = Object.keys(dbData);
    if (fields.length === 0) return this.findByUserId(userId) as Promise<RecruiterProfile>;

    const values = Object.values(dbData);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE recruiter_profiles SET ${setClause}, updated_at = NOW() WHERE user_id = $${fields.length + 1} RETURNING id, user_id, name, company_name AS "companyName", company_email, industry, description, company_size, logo_url, website, location, is_verified, created_at, updated_at`,
      [...values, userId],
    );
    return rows[0];
  },
};
