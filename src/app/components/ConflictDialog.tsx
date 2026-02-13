/**
 * ⚔️ CONFLICT RESOLUTION DIALOG
 * 
 * UI for resolving data conflicts between local and remote changes.
 * Allows users to choose: Keep Local, Keep Remote, or Merge.
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { Conflict, ConflictResolution } from '@/app/utils/conflict-resolver';
import { 
  formatConflictSummary, 
  getFieldLabel, 
  formatValue,
  getSuggestedResolution 
} from '@/app/utils/conflict-resolver';

interface ConflictDialogProps {
  conflicts: Conflict[];
  onResolve: (conflictIndex: number, resolution: ConflictResolution, mergedData?: Record<string, any>) => void;
  onResolveAll: (resolution: ConflictResolution) => void;
  onClose: () => void;
}

export function ConflictDialog({ conflicts, onResolve, onResolveAll, onClose }: ConflictDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFields, setSelectedFields] = useState<Record<string, 'local' | 'remote'>>({});
  const [resolution, setResolution] = useState<ConflictResolution>('merge');
  
  if (conflicts.length === 0) return null;
  
  const currentConflict = conflicts[currentIndex];
  const suggestedResolution = getSuggestedResolution(currentConflict);
  
  const handleResolve = () => {
    if (resolution === 'merge') {
      // Build merged data from selected fields
      const mergedData = { ...currentConflict.remoteData };
      
      currentConflict.fields.forEach(field => {
        const selected = selectedFields[field.field] || 'remote';
        if (selected === 'local') {
          mergedData[field.field] = field.localValue;
        }
      });
      
      onResolve(currentIndex, resolution, mergedData);
    } else {
      onResolve(currentIndex, resolution);
    }
    
    // Move to next conflict or close
    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedFields({});
    } else {
      onClose();
    }
  };
  
  const handleResolveAll = (res: ConflictResolution) => {
    onResolveAll(res);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--warning)]/10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[var(--warning)] flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-1">Conflict Detected</h2>
                <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                  The same record was changed both locally and remotely. Choose which version to keep.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-black/5 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
          <div className="flex items-center justify-between text-[0.875rem]">
            <div>
              <span className="font-semibold">Conflict {currentIndex + 1} of {conflicts.length}</span>
              <span className="text-[var(--muted-foreground)] ml-2">
                {currentConflict.table} • {formatConflictSummary(currentConflict)}
              </span>
            </div>
            {suggestedResolution && (
              <div className="text-[0.75rem] px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                Suggested: {suggestedResolution === 'keep-local' ? 'Keep Local' : suggestedResolution === 'keep-remote' ? 'Keep Remote' : 'Merge'}
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Resolution Strategy Selector */}
          <div className="mb-6">
            <label className="block text-[0.875rem] font-semibold mb-2">Resolution Strategy:</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setResolution('keep-local')}
                className={cn(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  resolution === 'keep-local' 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                )}
              >
                <div className="font-semibold mb-1">Keep Local</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Use your offline changes
                </div>
              </button>
              
              <button
                onClick={() => setResolution('keep-remote')}
                className={cn(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  resolution === 'keep-remote' 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                )}
              >
                <div className="font-semibold mb-1">Keep Remote</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Use server version
                </div>
              </button>
              
              <button
                onClick={() => setResolution('merge')}
                className={cn(
                  'p-4 border-2 rounded-lg text-left transition-all',
                  resolution === 'merge' 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                )}
              >
                <div className="font-semibold mb-1">Merge</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Choose field by field
                </div>
              </button>
            </div>
          </div>
          
          {/* Field Comparison */}
          {resolution === 'merge' ? (
            <div>
              <label className="block text-[0.875rem] font-semibold mb-3">
                Select which value to keep for each field:
              </label>
              <div className="space-y-2">
                {currentConflict.fields.map((field) => (
                  <div 
                    key={field.field}
                    className="border border-[var(--border)] rounded-lg overflow-hidden"
                  >
                    <div className="bg-[var(--muted)] px-4 py-2 font-semibold text-[0.875rem]">
                      {getFieldLabel(field.field)}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                      {/* Local Value */}
                      <button
                        onClick={() => setSelectedFields({ ...selectedFields, [field.field]: 'local' })}
                        className={cn(
                          'p-4 text-left hover:bg-[var(--secondary)] transition-colors',
                          selectedFields[field.field] === 'local' && 'bg-[var(--primary)]/10'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-[0.75rem] font-semibold text-[var(--primary)]">Your Change (Local)</div>
                          {selectedFields[field.field] === 'local' && (
                            <Check className="w-4 h-4 text-[var(--primary)]" />
                          )}
                        </div>
                        <div className="text-[0.875rem] font-mono break-all">
                          {formatValue(field.localValue)}
                        </div>
                      </button>
                      
                      {/* Remote Value */}
                      <button
                        onClick={() => setSelectedFields({ ...selectedFields, [field.field]: 'remote' })}
                        className={cn(
                          'p-4 text-left hover:bg-[var(--secondary)] transition-colors',
                          (!selectedFields[field.field] || selectedFields[field.field] === 'remote') && 'bg-[var(--success)]/10'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-[0.75rem] font-semibold text-[var(--success)]">Server Version (Remote)</div>
                          {(!selectedFields[field.field] || selectedFields[field.field] === 'remote') && (
                            <Check className="w-4 h-4 text-[var(--success)]" />
                          )}
                        </div>
                        <div className="text-[0.875rem] font-mono break-all">
                          {formatValue(field.remoteValue)}
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[0.875rem] font-semibold mb-3">Preview:</label>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-[0.875rem]">
                  <thead>
                    <tr className="bg-[var(--muted)]">
                      <th className="px-4 py-2 text-left font-semibold">Field</th>
                      <th className="px-4 py-2 text-left font-semibold">Local Value</th>
                      <th className="px-4 py-2 text-left font-semibold">Remote Value</th>
                      <th className="px-4 py-2 text-left font-semibold">Will Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConflict.fields.map((field, idx) => {
                      const willUseLocal = resolution === 'keep-local';
                      return (
                        <tr key={field.field} className={cn(idx % 2 === 0 && 'bg-[var(--muted)]/30')}>
                          <td className="px-4 py-2 font-medium">{getFieldLabel(field.field)}</td>
                          <td className="px-4 py-2 font-mono text-[0.75rem]">{formatValue(field.localValue)}</td>
                          <td className="px-4 py-2 font-mono text-[0.75rem]">{formatValue(field.remoteValue)}</td>
                          <td className="px-4 py-2">
                            <span className={cn(
                              'px-2 py-1 rounded text-[0.75rem] font-semibold',
                              willUseLocal ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--success)]/10 text-[var(--success)]'
                            )}>
                              {willUseLocal ? 'Local' : 'Remote'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--muted)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {conflicts.length > 1 && (
              <>
                <button
                  onClick={() => handleResolveAll('keep-local')}
                  className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium"
                >
                  Keep All Local
                </button>
                <button
                  onClick={() => handleResolveAll('keep-remote')}
                  className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium"
                >
                  Keep All Remote
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 text-[0.875rem] font-medium"
            >
              {currentIndex < conflicts.length - 1 ? 'Resolve & Next' : 'Resolve & Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
