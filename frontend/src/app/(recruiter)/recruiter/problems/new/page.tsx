'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Input } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';

const DEFAULT_STARTER = {
  python: '# Write your solution here\n',
  javascript: '// Write your solution here\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n',
};

export default function NewProblemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    constraints: '',
    difficulty: 'medium',
    hints: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await CodingApi.createProblem({
        ...form,
        hints: form.hints.split('\n').filter(Boolean),
        starter_code: DEFAULT_STARTER,
        supported_languages: ['python', 'javascript', 'java', 'cpp'],
      } as never);
      toast.success('Problem created');
      if (res.data?.id) router.push(ROUTES.recruiterProblemDetail(res.data.id));
    } catch {
      toast.error('Failed to create problem');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Problem</h1>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Constraints</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hints (one per line)</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.hints} onChange={(e) => setForm({ ...form, hints: e.target.value })} />
            </div>
            <Button type="submit" variant="brand" isLoading={saving}>Create Problem</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
