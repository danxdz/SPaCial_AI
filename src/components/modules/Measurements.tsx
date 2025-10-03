import { useUserStore } from '../../stores/useUserStore';
import { useI18nStore } from '../../stores/useI18nStore';
import ProductionMeasurements from './ProductionMeasurements';
import RoutesViewer from './RoutesViewer';
// import MeasurementsEnhanced from './MeasurementsEnhanced';

const Measurements = () => {
  const { currentUser } = useUserStore();
  const { t } = useI18nStore();
  
  const isAuthenticated = currentUser !== null;
  const isProductionUser = currentUser?.role === 'prod';

  // Show production interface for prod users
  if (isProductionUser) {
    return <ProductionMeasurements />;
  }

  // Show routes viewer for non-logged users
  if (!isAuthenticated) {
    return <RoutesViewer />;
  }

  // Show enhanced measurements interface for authenticated users
  return <ProductionMeasurements />;
};

export default Measurements;