import { useState, useEffect } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

interface Workshop {
  id: number;
  name: string;
  description?: string;
}

interface WorkshopSelectionProps {
  onNext: () => void;
  onBackToMain?: () => void;
}

const WorkshopSelection = ({ onNext, onBackToMain }: WorkshopSelectionProps) => {
  const { setSelectedWorkshop } = useUserStore();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setLoading(true);
      const workshopsData = await db.queryAll('SELECT id, name, description FROM workshops ORDER BY name');
      setWorkshops(workshopsData);
    } catch (error) {
      console.error('Error loading workshops:', error);
      toast.error('Failed to load workshops');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkshopSelect = (workshopId: number) => {
    setSelectedWorkshopId(workshopId);
  };

  const handleContinue = async () => {
    if (!selectedWorkshopId) {
      toast.error('Please select a workshop');
      return;
    }
    
    await setSelectedWorkshop(selectedWorkshopId);
    onNext();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Select Your Workshop
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Choose the workshop where you work
          </p>
        </div>

        <div className="space-y-4">
          {workshops.map((workshop) => (
            <div
              key={workshop.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedWorkshopId === workshop.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => handleWorkshopSelect(workshop.id)}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedWorkshopId === workshop.id
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedWorkshopId === workshop.id && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {workshop.name}
                  </h3>
                  {workshop.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {workshop.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
            >
              Back to Main
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!selectedWorkshopId}
            className={`px-6 py-2 rounded-md font-medium ${
              selectedWorkshopId
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkshopSelection;
