/**
 * Component for displaying release notes in an organized card format
 */

import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ReleaseNotes } from '@/types/diff-analyzer';

interface NotesCardProps {
  type: 'developer' | 'marketing';
  notes: string;
  className?: string;
}

const cardConfig = {
  developer: {
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-100 dark:border-blue-800',
    textClass: 'text-blue-700 dark:text-blue-400',
    icon: '👩‍💻',
    label: 'Developer Notes',
    ariaLabel: 'Developer',
  },
  marketing: {
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-100 dark:border-green-800',
    textClass: 'text-green-700 dark:text-green-400',
    icon: '🎯',
    label: 'Marketing Notes',
    ariaLabel: 'Marketing',
  },
};

export const NotesCard: React.FC<NotesCardProps> = ({
  type,
  notes,
  className = '',
}) => {
  const config = cardConfig[type];

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${config.bgClass} ${className}`}>
      <div className={`p-4 border-b flex items-center ${config.borderClass}`}>
        <span className="text-xl mr-2" role="img" aria-label={config.ariaLabel}>
          {config.icon}
        </span>
        <h3 className={`font-semibold ${config.textClass}`}>
          {config.label}
        </h3>
      </div>
      <div className="p-4">
        <MarkdownRenderer 
          content={notes}
          className="prose dark:prose-invert prose-sm max-w-none"
        />
      </div>
    </div>
  );
};

interface NotesDisplayProps {
  notes: ReleaseNotes;
  className?: string;
}

export const NotesDisplay: React.FC<NotesDisplayProps> = ({
  notes,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 animate-fadeIn ${className}`}>
      <NotesCard type="developer" notes={notes.developer} />
      <NotesCard type="marketing" notes={notes.marketing} />
    </div>
  );
};

export default NotesCard;