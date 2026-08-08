'use client';

import dynamic from 'next/dynamic';
import { CodingLanguage } from '@/types/coding';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const MONACO_LANG: Record<CodingLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
};

function defineJobytTheme(monaco: typeof import('monaco-editor')) {
  monaco.editor.defineTheme('jobyt-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C3FF3D' },
    ],
    colors: {
      'editor.background': '#0b1120',
      'editor.foreground': '#f4f7ff',
      'editorCursor.foreground': '#c3ff3d',
      'editor.selectionBackground': '#1e3a8a55',
      'editor.lineHighlightBackground': '#1a1a1a',
    },
  });
}

interface CodeEditorProps {
  language: CodingLanguage;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({ language, value, onChange, readOnly, height = '100%' }: CodeEditorProps) {
  return (
    <MonacoEditor
      height={height}
      language={MONACO_LANG[language]}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="jobyt-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      }}
      beforeMount={defineJobytTheme}
    />
  );
}
