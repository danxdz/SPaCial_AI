import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { crudService, TableInfo, TableData, QueryResult } from '../../services/crudService';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { 
  ArrowLeftIcon,
  TableCellsIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  CodeBracketIcon,
  EyeIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TableSelectorProps {
  selectedTable: string;
  onTableSelect: (table: string) => void;
  tables: string[];
}

const TableSelector = ({ selectedTable, onTableSelect, tables }: TableSelectorProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Select Table</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {tables.map(table => (
        <button
          key={table}
          onClick={() => onTableSelect(table)}
          className={`p-3 rounded-lg text-sm font-medium transition-colors ${
            selectedTable === table
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {table}
        </button>
      ))}
    </div>
  </div>
);

interface TableInfoPanelProps {
  tableInfo: TableInfo | null;
  loading: boolean;
}

const TableInfoPanel = ({ tableInfo, loading }: TableInfoPanelProps) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <InformationCircleIcon className="h-12 w-12 mx-auto mb-2" />
          <p>Select a table to view its information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Table: {tableInfo.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {tableInfo.rowCount} rows
          </span>
          {crudService.isReadonlyTable(tableInfo.name) && (
            <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
              Read Only
            </span>
          )}
          {crudService.isDangerousTable(tableInfo.name) && (
            <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
              Dangerous
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columns */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Columns</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {tableInfo.columns.map((column, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700 dark:text-gray-300">{column.name}</span>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500 dark:text-gray-400">{column.type}</span>
                  {column.primaryKey && (
                    <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      PK
                    </span>
                  )}
                  {!column.nullable && (
                    <span className="px-1 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                      NOT NULL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Foreign Keys */}
        {tableInfo.foreignKeys.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Foreign Keys</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {tableInfo.foreignKeys.map((fk, index) => (
                <div key={index} className="text-sm">
                  <span className="font-mono text-gray-700 dark:text-gray-300">{fk.column}</span>
                  <span className="text-gray-500 dark:text-gray-400"> → </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {fk.referencedTable}.{fk.referencedColumn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface DataTableProps {
  tableData: TableData | null;
  loading: boolean;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onSort: (column: string, direction: 'ASC' | 'DESC') => void;
  sortColumn?: string;
  sortDirection: 'ASC' | 'DESC';
}

const DataTable = ({ 
  tableData, 
  loading, 
  onEdit, 
  onDelete, 
  onSort, 
  sortColumn, 
  sortDirection 
}: DataTableProps) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
          <p>No data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {tableData.columns.map((column) => (
                <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button
                    onClick={() => onSort(column, sortColumn === column && sortDirection === 'ASC' ? 'DESC' : 'ASC')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100"
                  >
                    <span>{column}</span>
                    {sortColumn === column && (
                      sortDirection === 'ASC' ? 
                        <ArrowUpIcon className="h-3 w-3" /> : 
                        <ArrowDownIcon className="h-3 w-3" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tableData.data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {tableData.columns.map((column) => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row[column] === null ? (
                      <span className="text-gray-400 italic">null</span>
                    ) : (
                      String(row[column])
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(row)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(row)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {((tableData.page - 1) * tableData.pageSize) + 1} to {Math.min(tableData.page * tableData.pageSize, tableData.totalRows)} of {tableData.totalRows} results
        </div>
      </div>
    </div>
  );
};

interface QueryExecutorProps {
  onExecute: (sql: string) => void;
  loading: boolean;
}

const QueryExecutor = ({ onExecute, loading }: QueryExecutorProps) => {
  const [sql, setSql] = useState('');

  const handleExecute = () => {
    if (sql.trim()) {
      onExecute(sql);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
        <CodeBracketIcon className="h-5 w-5 mr-2" />
        SQL Query Executor
      </h3>
      <div className="space-y-3">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Enter SELECT query (e.g., SELECT * FROM users LIMIT 10)"
          className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Only SELECT queries are allowed for security
          </div>
          <button
            onClick={handleExecute}
            disabled={loading || !sql.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QueryResultsProps {
  result: QueryResult | null;
  loading: boolean;
}

const QueryResults = ({ result, loading }: QueryResultsProps) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (!result.success) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <span className="text-red-800 dark:text-red-200">{result.error}</span>
        </div>
      </div>
    );
  }

  if (!result.data || result.data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <CheckCircleIcon className="h-12 w-12 mx-auto mb-2" />
          <p>Query executed successfully</p>
          <p className="text-sm">No results returned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Query Results ({result.rowCount} rows)
          </h4>
          {result.executionTime && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Executed in {result.executionTime}ms
            </span>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {result.columns?.map((column) => (
                <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {result.data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {result.columns?.map((column) => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row[column] === null ? (
                      <span className="text-gray-400 italic">null</span>
                    ) : (
                      String(row[column])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DatabaseCRUD = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  
  // State
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  
  // Loading states
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingTableInfo, setLoadingTableInfo] = useState(false);
  const [loadingTableData, setLoadingTableData] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableInfo();
      loadTableData();
    }
  }, [selectedTable, searchTerm, sortColumn, sortDirection, currentPage]);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const availableTables = await crudService.getAvailableTables();
      setTables(availableTables);
      if (availableTables.length > 0) {
        setSelectedTable(availableTables[0]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoadingTables(false);
    }
  };

  const loadTableInfo = async () => {
    try {
      setLoadingTableInfo(true);
      const info = await crudService.getTableInfo(selectedTable);
      setTableInfo(info);
    } catch (error) {
      console.error('Error loading table info:', error);
      toast.error('Failed to load table information');
    } finally {
      setLoadingTableInfo(false);
    }
  };

  const loadTableData = async () => {
    try {
      setLoadingTableData(true);
      const data = await crudService.getTableData(
        selectedTable,
        currentPage,
        pageSize,
        searchTerm || undefined,
        sortColumn || undefined,
        sortDirection
      );
      setTableData(data);
    } catch (error) {
      console.error('Error loading table data:', error);
      toast.error('Failed to load table data');
    } finally {
      setLoadingTableData(false);
    }
  };

  const handleTableSelect = (table: string) => {
    setSelectedTable(table);
    setSearchTerm('');
    setSortColumn('');
    setSortDirection('ASC');
    setCurrentPage(1);
    setTableData(null);
    setTableInfo(null);
  };

  const handleSort = (column: string, direction: 'ASC' | 'DESC') => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleEdit = (row: any) => {
    setEditingRow(row);
    setShowEditModal(true);
  };

  const handleDelete = async (row: any) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const result = await crudService.deleteRecord(selectedTable, row.id);
      if (result.success) {
        toast.success('Record deleted successfully');
        loadTableData();
      } else {
        toast.error(result.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleCreate = () => {
    setEditingRow(null);
    setShowCreateModal(true);
  };

  const handleExecuteQuery = async (sql: string) => {
    try {
      setLoadingQuery(true);
      const result = await crudService.executeQuery(sql);
      setQueryResult(result);
      
      if (result.success) {
        toast.success(`Query executed successfully (${result.rowCount} rows)`);
      } else {
        toast.error(result.error || 'Query failed');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast.error('Failed to execute query');
    } finally {
      setLoadingQuery(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await crudService.exportTableToCSV(selectedTable);
      if (result.success && result.csv) {
        // Create and download CSV file
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('CSV exported successfully');
      } else {
        toast.error(result.error || 'Failed to export CSV');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          {canGoBack() && (
            <button
              onClick={() => {
                const previousModule = goBack();
                if (previousModule) {
                  navigationService.navigateTo(previousModule);
                }
              }}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <TableCellsIcon className="h-8 w-8 mr-3 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Database CRUD Manager
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Manage database tables, view data, and execute queries with full CRUD operations.
        </p>
      </div>

      {/* Table Selector */}
      <TableSelector
        selectedTable={selectedTable}
        onTableSelect={handleTableSelect}
        tables={tables}
      />

      {/* Table Info Panel */}
      <TableInfoPanel tableInfo={tableInfo} loading={loadingTableInfo} />

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreate}
              disabled={crudService.isReadonlyTable(selectedTable)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Query Executor */}
      <QueryExecutor onExecute={handleExecuteQuery} loading={loadingQuery} />

      {/* Query Results */}
      {queryResult && <QueryResults result={queryResult} loading={loadingQuery} />}

      {/* Data Table */}
      <DataTable
        tableData={tableData}
        loading={loadingTableData}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* TODO: Add Edit/Create Modals */}
      {/* These would be implemented as separate components */}
    </div>
  );
};

export default DatabaseCRUD;

