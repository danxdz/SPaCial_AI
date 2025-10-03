import React, { useState, useRef, useEffect } from 'react';
import { useI18nStore } from '../../stores/useI18nStore';
// import { useThemeStore } from '../../stores/useThemeStore';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'date';
  editable?: boolean;
  required?: boolean;
  options?: { value: string; label: string }[];
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface EnhancedTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (rowIndex: number, columnKey: string, value: any) => Promise<void>;
  onDelete?: (rowIndex: number) => Promise<void>;
  onAdd?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function EnhancedTable({
  data,
  columns,
  onEdit,
  onDelete,
  onAdd,
  loading = false,
  emptyMessage,
  className = '',
}: EnhancedTableProps) {
  const { t } = useI18nStore();
  // const { theme } = useThemeStore();
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current && 'select' in inputRef.current) {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [editingCell]);

  const handleCellClick = (rowIndex: number, columnKey: string, column: Column) => {
    if (!column.editable || !onEdit) return;
    
    setEditingCell({ row: rowIndex, column: columnKey });
    setEditValue(data[rowIndex][columnKey] || '');
  };

  const handleSave = async () => {
    if (!editingCell || !onEdit) return;

    try {
      await onEdit(editingCell.row, editingCell.column, editValue);
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving cell:', error);
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const renderCellContent = (rowIndex: number, column: Column, value: any) => {
    if (editingCell?.row === rowIndex && editingCell?.column === column.key) {
      return (
        <div className="relative">
          {column.type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full min-h-[60px] p-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              rows={3}
            />
          ) : column.type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full p-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              {column.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={column.type || 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full p-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          )}
        </div>
      );
    }

    return (
      <div 
        className={`${column.editable ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded transition-colors' : ''}`}
        onClick={() => handleCellClick(rowIndex, column.key, column)}
      >
        {value || '-'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-4">📊</div>
        <p>{emptyMessage || t('common.noData')}</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.add')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 ${column.width ? `w-${column.width}` : ''}`}
                style={{ textAlign: column.align || 'left' }}
              >
                {column.label}
                {column.required && <span className="text-red-500 ml-1">*</span>}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300 w-24">
                {t('common.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`
                border-b border-gray-200 dark:border-gray-700 transition-colors
                ${rowIndex % 2 === 0 
                  ? 'bg-white dark:bg-gray-900' 
                  : 'bg-gray-50 dark:bg-gray-800'
                }
                ${hoveredRow === rowIndex 
                  ? 'bg-blue-50 dark:bg-gray-700' 
                  : ''
                }
                hover:bg-blue-50 dark:hover:bg-gray-700
              `}
              onMouseEnter={() => setHoveredRow(rowIndex)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${column.width ? `w-${column.width}` : ''}`}
                  style={{ textAlign: column.align || 'left' }}
                >
                  {renderCellContent(rowIndex, column, row[column.key])}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => handleCellClick(rowIndex, columns[0].key, columns[0])}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title={t('common.edit')}
                      >
                        ✏️
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(rowIndex)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title={t('common.delete')}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
