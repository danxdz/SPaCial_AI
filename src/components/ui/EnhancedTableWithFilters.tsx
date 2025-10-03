import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';

interface Column {
  key: string;
  label: string;
  editable?: boolean;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { value: string; label: string }[];
}

interface EnhancedTableWithFiltersProps {
  data: any[];
  columns: Column[];
  onEdit?: (rowIndex: number, columnKey: string, value: any) => void;
  onDelete?: (rowIndex: number) => void;
  onAdd?: () => void;
  onRowClick?: (rowIndex: number, rowData: any) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const EnhancedTableWithFilters: React.FC<EnhancedTableWithFiltersProps> = ({
  data,
  columns,
  onEdit,
  onDelete,
  onAdd,
  onRowClick,
  loading = false,
  emptyMessage = "No data found",
  className = ""
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(row => {
      return Object.entries(filters).every(([columnKey, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = row[columnKey];
        if (cellValue === null || cellValue === undefined) return false;
        return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDirection === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [data, filters, sortColumn, sortDirection]);

  const handleCellClick = (rowIndex: number, columnKey: string, value: any) => {
    const column = columns.find(col => col.key === columnKey);
    if (column?.editable) {
      setEditingCell({ row: rowIndex, column: columnKey });
      setEditValue(value || '');
    }
  };

  const handleCellSave = async () => {
    if (!editingCell || !onEdit) return;

    try {
      await onEdit(editingCell.row, editingCell.column, editValue);
      setEditingCell(null);
      setEditValue('');
      toast.success('Updated successfully!');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSortColumn('');
    setSortDirection('asc');
  };

  const handleDelete = async (rowIndex: number) => {
    if (!onDelete) return;
    
    try {
      await onDelete(rowIndex);
      toast.success('Deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Table Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary text-sm"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {(Object.keys(filters).length > 0 || sortColumn) && (
              <button
                onClick={clearFilters}
                className="btn btn-secondary text-sm"
              >
                Clear All
              </button>
            )}
          </div>
          
          {onAdd && (
            <button
              onClick={onAdd}
              className="btn btn-primary"
            >
              Add New
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {columns.filter(col => col.filterable !== false).map(column => (
              <div key={column.key}>
                <label className="label text-xs text-gray-600 dark:text-gray-400">
                  Filter by {column.label}
                </label>
                {column.filterType === 'select' ? (
                  <select
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">All {column.label}</option>
                    {column.filterOptions?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="input text-sm"
                    placeholder={`Filter ${column.label}...`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <div className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="table-zebra">
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    // Don't trigger row click if clicking on editable cells or action buttons
                    if (onRowClick && !editingCell && !e.currentTarget.querySelector('.action-button')) {
                      onRowClick(rowIndex, row);
                    }
                  }}
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${
                        column.editable ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900' : ''
                      }`}
                      onClick={() => handleCellClick(rowIndex, column.key, row[column.key])}
                    >
                      {editingCell?.row === rowIndex && editingCell?.column === column.key ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type={column.type === 'number' ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="input text-sm py-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            onBlur={handleCellSave}
                          />
                        </div>
                      ) : (
                        <div className="text-gray-900 dark:text-gray-100">
                          {column.type === 'date' && row[column.key]
                            ? new Date(row[column.key]).toLocaleDateString()
                            : row[column.key] || '-'
                          }
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      {onDelete && (
                        <button
                          onClick={() => handleDelete(rowIndex)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 action-button"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {filteredAndSortedData.length} of {data.length} records
          </span>
          {sortColumn && (
            <span>
              Sorted by {columns.find(col => col.key === sortColumn)?.label} ({sortDirection})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedTableWithFilters;
