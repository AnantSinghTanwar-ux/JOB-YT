'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  RoadmapApi,
  RoadmapFullData,
  RoadmapProgressResponse,
  SkillRecommendationResponse,
} from '@/lib/api/roadmaps.api';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft,
  FaCircleCheck,
  FaStar,
  FaSpinner,
  FaCrosshairs,
  FaLock,
  FaCheck,
  FaBookOpen,
} from 'react-icons/fa6';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

function RoadmapGraphInner() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { fitView, setCenter } = useReactFlow();

  const [data, setData] = useState<RoadmapFullData | null>(null);
  const [progress, setProgress] = useState<RoadmapProgressResponse | null>(null);
  const [recommendation, setRecommendation] = useState<SkillRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const { user } = useAuthStore();

  const loadRoadmapData = useCallback(async () => {
    try {
      const result = await RoadmapApi.getNodes(slug);
      setData(result);

      if (user?.id) {
        const [prog, rec] = await Promise.all([
          RoadmapApi.getProgress(slug, user.id),
          RoadmapApi.getRecommendedNextSkill(slug, user.id),
        ]);
        setProgress(prog);
        setRecommendation(rec);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load roadmap graph';
      toast.error(msg);
      router.push(ROUTES.roadmaps);
    } finally {
      setLoading(false);
    }
  }, [slug, router, user?.id]);

  useEffect(() => {
    loadRoadmapData();
  }, [loadRoadmapData]);

  // Handle checking/unchecking a skill node
  const toggleSkillCompletion = async (nodeTitle: string, isCurrentlyCompleted: boolean) => {
    if (!user?.id) {
      toast.error('Please log in to track your learning progress.');
      return;
    }
    setUpdatingSkill(nodeTitle);
    try {
      // Fetch current profile skills
      const profileRes = await api.get<any>('/users/me');
      const currentSkills: string[] = profileRes.data?.profile?.skills || [];

      let newSkills: string[];
      if (isCurrentlyCompleted) {
        newSkills = currentSkills.filter(
          (s) => s.toLowerCase().trim() !== nodeTitle.toLowerCase().trim()
        );
      } else {
        newSkills = [...currentSkills, nodeTitle];
      }

      // Update skills in database
      await api.put('/users/me', { skills: newSkills });

      toast.success(
        isCurrentlyCompleted
          ? `Removed "${nodeTitle}" from your skills.`
          : `Marked "${nodeTitle}" as completed!`
      );

      // Refresh progress & recommendation states
      const [prog, rec] = await Promise.all([
        RoadmapApi.getProgress(slug, user.id),
        RoadmapApi.getRecommendedNextSkill(slug, user.id),
      ]);
      setProgress(prog);
      setRecommendation(rec);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update your learning progress');
    } finally {
      setUpdatingSkill(null);
    }
  };

  // Compute graph layouts & styles
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const JUNK_TYPES = new Set(['horizontal', 'vertical', 'label', 'paragraph', 'legend', 'straight', 'step', 'simplebezier', 'button', 'linksgroup']);

    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 50;

    const completedSet = new Set(progress?.completedNodes.map((n) => n.id) || []);
    const recommendedSet = new Set(
      recommendation?.recommendedNode ? [recommendation.recommendedNode.id] : []
    );

    const rfNodes: Node[] = data.nodes.map((n) => {
      const normTitle = n.title.toLowerCase().replace(/[-_ ]/g, '');
      const isJunk = JUNK_TYPES.has(n.type) || normTitle === 'horizontalnode' || normTitle === 'verticalnode';
      const screenX = (n.position_x || 0) * 1.5;
      const screenY = (n.position_y || 0) * 1.8;

      const isCompleted = completedSet.has(n.id);
      const isRecommended = recommendedSet.has(n.id);

      let background = '#141414';
      let color = '#f8fafc';
      let border = '1px solid #334155';
      let boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.5)';

      if (isCompleted) {
        background = '#064e3b'; // dark green
        border = '1px solid #10b981'; // emerald 500
        color = '#a7f3d0'; // emerald 200
        boxShadow = '0 0 15px -3px rgba(16, 185, 129, 0.3)';
      } else if (isRecommended) {
        background = '#451a03'; // dark amber
        border = '2px dashed #f59e0b'; // amber 500
        color = '#fde68a'; // amber 200
        boxShadow = '0 0 20px 0px rgba(245, 158, 11, 0.4)';
      }

      return {
        id: n.id,
        position: { x: screenX, y: screenY },
        data: { label: isJunk ? '' : (isCompleted ? `✓ ${n.title}` : n.title) },
        type: n.type === 'root' ? 'input' : 'default',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: isJunk
          ? {
              opacity: 0,
              pointerEvents: 'none',
              width: 1,
              height: 1,
              padding: 0,
              border: 'none',
              background: 'transparent'
            }
          : {
              background,
              color,
              border,
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '12px',
              padding: '14px 12px',
              width: NODE_WIDTH,
              textAlign: 'center',
              boxShadow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1.4',
              letterSpacing: '0.02em',
            },
      };
    });

    const rfEdges: Edge[] = data.edges.map((e) => {
      const isCompleted = completedSet.has(e.source_node_id) && completedSet.has(e.target_node_id);
      const isSourceCompleted = completedSet.has(e.source_node_id);
      
      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: 'smoothstep',
        animated: isSourceCompleted && !isCompleted,
        style: {
          stroke: isCompleted ? '#10b981' : '#334155',
          strokeWidth: isCompleted ? 3 : 2,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, progress, recommendation]);

  // Center/focus on a specific node in React Flow graph
  const focusOnNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 90, node.position.y + 25, {
        zoom: 1.2,
        duration: 800,
      });
    } else {
      toast.error('Unable to locate topic in graph');
    }
  };

  const handleResetView = () => {
    fitView({ padding: 0.2, duration: 800 });
  };

  const completedIds = useMemo(
    () => new Set(progress?.completedNodes.map((n) => n.id) || []),
    [progress]
  );
  const recommendedNodeId = recommendation?.recommendedNode?.id || null;

  // Filter topics for list pane
  const filteredTopics = useMemo(() => {
    if (!data) return [];
    const JUNK_TYPES = new Set(['horizontal', 'vertical', 'label', 'paragraph', 'legend', 'straight', 'step', 'simplebezier', 'button', 'linksgroup']);
    
    return data.nodes.filter((node) => {
      const normTitle = node.title.toLowerCase().replace(/[-_ ]/g, '');
      const isJunk = JUNK_TYPES.has(node.type) || normTitle === 'horizontalnode' || normTitle === 'verticalnode';
      if (isJunk) return false;

      const isDone = completedIds.has(node.id);
      if (filter === 'completed') return isDone;
      if (filter === 'pending') return !isDone;
      return true;
    });
  }, [data, completedIds, filter]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0A0A0A] min-h-[50vh] rounded-3xl">
        <FaSpinner className="text-[#C3FF3D] animate-spin text-5xl mb-4" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl">
      {/* ── Left Pane: Learning Progress & Recommended Skill (scrollable dark slates) ── */}
      <div className="w-[380px] shrink-0 bg-[#141414] text-white border-r border-white/10 p-6 flex flex-col h-full overflow-y-auto scrollbar-thin">
        {/* Navigation back */}
        <Link
          href={ROUTES.roadmaps}
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <FaArrowLeft className="mr-1.5" /> Back to Roadmaps
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-white leading-tight">{data.roadmap.title}</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {data.roadmap.description || `Learning path for ${data.roadmap.title}.`}
          </p>
          <div className="flex gap-2 items-center mt-3">
            <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded-md text-[10px] font-bold border border-white/5 uppercase">
              {data.nodes.length} Topics
            </span>
            <a
              href={data.roadmap.source_url}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-0.5 bg-[#C3FF3D]/10 text-[#C3FF3D] border border-[#C3FF3D]/10 rounded-md text-[10px] font-bold uppercase hover:bg-[#C3FF3D]/25 transition-colors"
            >
              Source
            </a>
          </div>
        </div>

        {/* Progress Card */}
        {progress && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Completion Progress
              </span>
              <span className="text-xs font-extrabold text-lime-400">
                {progress.completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-lime-400 h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(163,230,53,0.5)]"
                style={{ width: `${progress.completionPercentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {progress.completedNodes.length} of {progress.totalNodes} topics completed.
            </p>
          </div>
        )}

        {/* Next Recommendation Card */}
        {recommendation?.recommendedNode && (
          <div className="bg-amber-950/20 border-2 border-dashed border-amber-500/50 rounded-2xl p-5 mb-6 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)]">
            <div className="flex items-center gap-1.5 mb-2 text-amber-400">
              <FaStar className="text-sm shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Next recommended skill
              </span>
            </div>
            <h4 className="font-extrabold text-white text-base leading-tight">
              {recommendation.recommendedNode.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              {recommendation.reason}
            </p>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => focusOnNode(recommendation.recommendedNode!.id)}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-extrabold text-xs rounded-full py-2 flex items-center justify-center gap-1 transition-all"
              >
                <FaCrosshairs className="text-xs" />
                Focus
              </button>
              <button
                type="button"
                onClick={() =>
                  toggleSkillCompletion(recommendation.recommendedNode!.title, false)
                }
                disabled={updatingSkill === recommendation.recommendedNode.title}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-extrabold text-xs rounded-full py-2 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {updatingSkill === recommendation.recommendedNode.title ? (
                  <FaSpinner className="animate-spin text-xs" />
                ) : (
                  <>
                    <FaCheck className="text-xs" />
                    Complete
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Topics List with Filters */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
              Topics Checklist
            </h3>
            {/* Reset Zoom Button */}
            <button
              onClick={handleResetView}
              className="text-[10px] font-bold text-[#C3FF3D] hover:underline"
            >
              Reset View
            </button>
          </div>

          {/* Filter switcher */}
          <div className="flex bg-white/5 rounded-full p-1 border border-white/5 mb-4">
            {(['all', 'completed', 'pending'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`flex-1 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all ${
                  filter === opt ? 'bg-[#C3FF3D] text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Topics checklist scrollbox */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
            {filteredTopics.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs italic">
                No topics in this category.
              </div>
            ) : (
              filteredTopics.map((node) => {
                const isCompleted = completedIds.has(node.id);
                const isRecommended = recommendedNodeId === node.id;
                const isProcessing = updatingSkill === node.title;

                return (
                  <div
                    key={node.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isRecommended
                        ? 'bg-amber-950/10 border-amber-500/30'
                        : isCompleted
                        ? 'bg-green-950/10 border-green-500/20'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Checkbox trigger + Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleSkillCompletion(node.title, isCompleted)}
                        disabled={isProcessing}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors focus:outline-none ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-black'
                            : 'border-white/30 hover:border-[#C3FF3D]'
                        }`}
                      >
                        {isProcessing ? (
                          <FaSpinner className="animate-spin text-[8px] text-white" />
                        ) : isCompleted ? (
                          <FaCheck className="text-[9px]" />
                        ) : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-semibold text-xs leading-tight block ${
                            isCompleted ? 'text-slate-400 line-through' : 'text-slate-100'
                          }`}
                        >
                          {node.title}
                        </span>
                        {isRecommended && (
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block mt-0.5">
                            Recommended Next
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Focus zoom trigger */}
                    <button
                      type="button"
                      onClick={() => focusOnNode(node.id)}
                      className="w-7 h-7 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors hover:bg-white/10 shrink-0"
                      title="Focus on Node"
                    >
                      <FaCrosshairs className="text-xs" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Right Pane: React Flow interactive node map canvas ── */}
      <div className="flex-grow h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#334155" gap={24} size={2} />
          <Controls className="!bg-[#1e293b] !border-[#334155] !fill-slate-300 shadow-lg" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function RoadmapGraphPage() {
  return (
    <ReactFlowProvider>
      <RoadmapGraphInner />
    </ReactFlowProvider>
  );
}
