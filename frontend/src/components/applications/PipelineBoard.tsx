'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ApplicationStatus } from '@/types';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/constants';
import { Avatar, Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { ApplicationTimeline } from './ApplicationTimeline';

// Components for DND
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

interface Candidate {
  id: string; // application id
  applicant_id: string; // user id
  name: string;
  photo_url: string | null;
  skills: string[];
  created_at: string;
  status_updated_at: string;
}

interface BoardData {
  stages: Record<ApplicationStatus, Candidate[]>;
  totalCandidates: number;
}

const SortableCandidateCard = ({ candidate, onClickPipeline }: { candidate: Candidate; onClickPipeline: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.applicant_id, data: { candidate } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border text-left cursor-grab p-3 rounded-xl shadow-sm hover:shadow transition relative
        ${isDragging ? 'border-blue-500 z-50 ring-2 ring-blue-200' : 'border-gray-200'}`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
         <div className="flex items-center gap-2">
           <Avatar name={candidate.name || 'U'} size="sm" src={resolveAssetUrl(candidate.photo_url) || undefined} />
           <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-1">{candidate.name}</p>
         </div>
      </div>
      
      {candidate.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.skills.slice(0, 2).map((s) => (
            <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{s}</span>
          ))}
          {candidate.skills.length > 2 && (
             <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded text-[10px] font-medium">+{candidate.skills.length - 2}</span>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          {formatDate(candidate.status_updated_at)}
        </p>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); onClickPipeline(); }}
          className="text-blue-600 hover:text-blue-800 text-[10px] uppercase font-bold tracking-wider rounded transition-colors"
        >
          History
        </button>
      </div>
    </div>
  );
};

const DroppableColumn = ({ id, title, candidates, setTimelineId }: { id: ApplicationStatus, title: string, candidates: Candidate[], setTimelineId: (id: string) => void }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      className={`min-w-[280px] w-[280px] shrink-0 flex flex-col bg-gray-50/50 rounded-2xl border transition-colors
        ${isOver ? 'border-blue-300 bg-blue-50/20 shadow-inner' : 'border-gray-200'}
      `}
    >
      <div className="p-3 border-b border-gray-200/50 bg-white/50 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-semibold text-gray-800 text-sm tracking-tight">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">{candidates.length}</span>
      </div>
      
      <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3 min-h-[150px] overflow-y-auto">
        <SortableContext items={candidates.map(c => c.applicant_id)} strategy={verticalListSortingStrategy}>
          {candidates.map(c => (
            <SortableCandidateCard key={c.applicant_id} candidate={c} onClickPipeline={() => setTimelineId(c.id)} />
          ))}
        </SortableContext>
        
        {candidates.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-24 text-gray-400 text-xs font-medium">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
};

export const PipelineBoard = ({ jobId }: { jobId: string }) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [timelineAppId, setTimelineAppId] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get<BoardData>(`/pipeline/board/${jobId}`);
      setBoard(res.data ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch board';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum drag distance before firing
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const candidateData = active.data.current?.candidate as Candidate;
    if (candidateData) {
      setActiveCandidate(candidateData);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCandidate(null);
    const { active, over } = event;
    
    if (!over || !board) return;

    const applicantId = active.id as string;
    const targetStage = over.id as ApplicationStatus;

    // Find current stage
    let currentStage: ApplicationStatus | null = null;
    let candidateToMove: Candidate | null = null;
    
    for (const stage of APPLICATION_STATUSES) {
      const c = board.stages[stage].find(c => c.applicant_id === applicantId);
      if (c) {
        currentStage = stage;
        candidateToMove = c;
        break;
      }
    }

    if (!currentStage || !candidateToMove || currentStage === targetStage) return;

    // OPTIMISTIC UPDATE
    const previousBoardState = JSON.parse(JSON.stringify(board)) as BoardData;
    
    setBoard((prev) => {
      if (!prev) return prev;
      const newStages = { ...prev.stages };
      newStages[currentStage!] = newStages[currentStage!].filter(c => c.applicant_id !== applicantId);
      newStages[targetStage] = [{ ...candidateToMove!, status_updated_at: new Date().toISOString() }, ...newStages[targetStage]];
      return { ...prev, stages: newStages };
    });

    try {
      await api.patch('/pipeline/move-stage', {
        jobId,
        candidateId: applicantId,
        toStage: targetStage,
      });
      toast.success(`Moved to ${APPLICATION_STATUS_LABELS[targetStage]}`);
      // Re-fetch to guarantee sync (or rely on optimistic ui)
      fetchBoard();
     } catch (err) {
       // ROllback
       setBoard(previousBoardState);
       const message = err instanceof Error ? err.message : 'Failed to move candidate';
       toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1,2,3,4].map(i => (
          <div key={i} className="min-w-[280px] w-[280px] h-[600px] bg-gray-50 animate-pulse rounded-2xl border border-gray-200 p-3">
             <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
             <div className="h-24 bg-white rounded-xl mb-3 shadow-sm border border-gray-100"></div>
             <div className="h-24 bg-white rounded-xl shadow-sm border border-gray-100"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!board) return null;

  return (
    <>
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-h-[500px] items-start">
            {APPLICATION_STATUSES.map((status) => (
              <DroppableColumn 
                key={status} 
                id={status} 
                title={APPLICATION_STATUS_LABELS[status]} 
                candidates={board.stages[status] || []} 
                setTimelineId={setTimelineAppId}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeCandidate ? (
              <div className="bg-white border-2 border-blue-500 text-left p-3 rounded-xl shadow-2xl opacity-90 scale-105 cursor-grabbing">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={activeCandidate.name || 'U'} size="sm" src={resolveAssetUrl(activeCandidate.photo_url) || undefined} />
                  <p className="font-semibold text-sm text-gray-900">{activeCandidate.name}</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {timelineAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 !m-0">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Pipeline History</h3>
              <button onClick={() => setTimelineAppId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 focus:outline-none">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ApplicationTimeline applicationId={timelineAppId} />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setTimelineAppId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
