import { API_BASE } from '@/constants';

export interface RoadmapMetadata {
  id: string;
  slug: string;
  title: string;
  description: string;
  source_url: string;
  version: number;
  node_count: number;
}

export interface RoadmapNode {
  id: string;
  roadmap_id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  parent_id: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
}

export interface RoadmapEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
}

export interface RoadmapFullData {
  roadmap: RoadmapMetadata;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export interface PaginatedRoadmaps {
  data: RoadmapMetadata[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MatchDetail {
  nodeId: string;
  nodeTitle: string;
  nodeSlug: string;
  matchedSkill: string | null;
  matchType: 'exact' | 'normalized' | null;
}

export interface RoadmapProgressResponse {
  roadmap: { id: string; slug: string; title: string };
  completionPercentage: number;
  totalNodes: number;
  completedNodes: { id: string; title: string; slug: string; matchedSkill: string }[];
  pendingNodes: { id: string; title: string; slug: string }[];
  matchDetails: MatchDetail[];
}

export interface SkillRecommendationResponse {
  recommendedNode?: {
    id: string; title: string; slug: string; description: string | null; type: string;
  };
  reason?: string;
  prerequisitesSatisfied?: { id: string; title: string }[];
  estimatedProgressGain?: number;
  learningResources?: string | null;
  completed?: boolean;
  message?: string;
}

import { tokenStore } from '../api';
import { authStorage } from '../auth';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get() || authStorage.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!json.success) {
    throw new Error(json.message || 'API Request failed');
  }

  return json.data;
}

export const RoadmapApi = {
  /** Get paginated list of roadmaps */
  async list(page = 1, limit = 20): Promise<PaginatedRoadmaps> {
    // The endpoint returns { success, message, data, pagination }
    // We adjust fetchApi to handle this or just return the raw response
    const response = await fetch(`${API_BASE}/roadmaps?page=${page}&limit=${limit}`);
    const json = await response.json();
    if (!json.success) throw new Error(json.message);
    return { data: json.data, pagination: json.pagination };
  },

  /** Get basic roadmap metadata by slug */
  async getBySlug(slug: string): Promise<RoadmapMetadata> {
    return fetchApi<RoadmapMetadata>(`/roadmaps/${slug}`);
  },

  /** Get roadmap with all nodes and edges */
  async getNodes(slug: string): Promise<RoadmapFullData> {
    return fetchApi<RoadmapFullData>(`/roadmaps/${slug}/nodes`);
  },

  /** Get roadmap progress for a user */
  async getProgress(roadmapId: string, userId: string): Promise<RoadmapProgressResponse> {
    return fetchApi<RoadmapProgressResponse>(`/users/${userId}/roadmaps/${roadmapId}/progress`);
  },

  /** Get next skill recommendation for a user */
  async getRecommendedNextSkill(roadmapId: string, userId: string): Promise<SkillRecommendationResponse> {
    return fetchApi<SkillRecommendationResponse>(`/users/${userId}/roadmaps/${roadmapId}/recommend-next-skill`);
  },
};
