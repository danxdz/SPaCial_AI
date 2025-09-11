# SPaCial_AI - Statistical Process Control Web Application

A modern, production-ready Statistical Process Control (SPC) web application built with React 19, TypeScript, and Tailwind CSS. SPaCial_AI provides comprehensive tools for monitoring and controlling manufacturing processes through statistical analysis and control charts.

## 🚀 Features

### Core SPC Functionality
- **Control Charts**: X-bar and R, X-bar and S, I-MR, p-chart, np-chart, c-chart, u-chart
- **Control Limits**: Automatic calculation of UCL, LCL, and center lines
- **Western Electric Rules**: Detection of 8 Nelson rules for out-of-control conditions
- **Process Capability**: Cp, Cpk, Pp, Ppk calculations with sigma levels
- **Real-time Monitoring**: Live data updates and violation alerts

### Data Management
- **Import/Export**: CSV and Excel file support
- **Data Validation**: Automatic data quality checks
- **Batch Tracking**: Support for lot/batch identification
- **Multiple Variables**: Handle different measurement types
- **Data Persistence**: LocalStorage with automatic backup

### Dashboard & Analytics
- **Interactive Charts**: Zoom, pan, and point selection
- **Statistical Summary**: Comprehensive process statistics
- **Alert System**: Configurable notifications for violations
- **Multi-process Views**: Compare different processes
- **Trend Analysis**: Pattern detection and forecasting

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: System preference detection
- **Professional UI**: Clean, industrial interface
- **Keyboard Shortcuts**: Power user features
- **PWA Support**: Offline capabilities

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **Charts**: Chart.js + React-ChartJS-2
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Data Processing**: Papa Parse (CSV), XLSX (Excel)
- **PDF Generation**: jsPDF + html2canvas
- **Build Tool**: Vite
- **Icons**: Heroicons

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spc-vision
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/
│   ├── charts/          # Chart components (SPCChart, etc.)
│   ├── dashboard/       # Dashboard widgets and layout
│   ├── forms/          # Data entry and configuration forms
│   ├── reports/        # Report generation components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── utils/              # Statistical calculations and utilities
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
├── data/               # Sample data and datasets
└── lib/                # External library configurations
```

## 📊 Sample Data

The application includes realistic sample datasets for different industries:

- **Automotive**: Engine piston diameter measurements
- **Food Processing**: Cookie weight control
- **Chemical**: pH level monitoring
- **Electronics**: Resistor resistance testing
- **Quality Control**: Surface defect counting

## 🎯 Usage Guide

### Creating Your First Process

1. **Select a Process**: Choose from the sample processes or create a new one
2. **Configure Specifications**: Set upper/lower specification limits and target values
3. **Import Data**: Upload CSV/Excel files or enter data manually
4. **Create Charts**: Generate appropriate control charts for your data type
5. **Monitor**: Watch for control rule violations and process trends

### Chart Types

- **X-bar and R Charts**: For continuous data with subgroups (most common)
- **X-bar and S Charts**: For continuous data when subgroup size > 10
- **I-MR Charts**: For individual measurements without subgroups
- **p-Charts**: For proportion defective data
- **np-Charts**: For number defective data (constant sample size)
- **c-Charts**: For defects per unit (constant inspection unit)
- **u-Charts**: For defects per unit (variable inspection unit)

### Control Rules (Western Electric Rules)

1. **Rule 1**: Point beyond 3-sigma limits
2. **Rule 2**: Nine consecutive points on same side of center line
3. **Rule 3**: Six consecutive points increasing or decreasing
4. **Rule 4**: Fourteen consecutive points alternating up and down
5. **Rule 5**: Two out of three consecutive points beyond 2-sigma limits
6. **Rule 6**: Four out of five consecutive points beyond 1-sigma limits
7. **Rule 7**: Fifteen consecutive points within 1-sigma limits
8. **Rule 8**: Eight consecutive points beyond 1-sigma limits

## 📈 Statistical Calculations

### Control Limits
- **UCL**: Upper Control Limit = Center Line + (3 × Sigma)
- **LCL**: Lower Control Limit = Center Line - (3 × Sigma)
- **CL**: Center Line = Process Mean

### Process Capability
- **Cp**: Process capability = (USL - LSL) / (6 × Sigma)
- **Cpk**: Process capability index = min(CPU, CPL)
- **CPU**: Upper capability = (USL - Mean) / (3 × Sigma)
- **CPL**: Lower capability = (Mean - LSL) / (3 × Sigma)

### Capability Interpretation
- **Cp/Cpk ≥ 1.67**: Excellent (6-sigma process)
- **Cp/Cpk ≥ 1.33**: Good (4-sigma process)
- **Cp/Cpk ≥ 1.00**: Marginal (3-sigma process)
- **Cp/Cpk < 1.00**: Poor (needs improvement)

## 🔧 Configuration

### User Preferences
- **Theme**: Light, dark, or system preference
- **Language**: English or Portuguese
- **Default Sigma Level**: 2σ or 3σ control limits
- **Chart Colors**: Customizable color schemes
- **Notifications**: Email and browser alerts
- **Auto-save**: Automatic data persistence

### Keyboard Shortcuts
- `Ctrl+N`: New process
- `Ctrl+S`: Save data
- `Ctrl+O`: Open file
- `Ctrl+E`: Export data
- `Ctrl+D`: Dashboard view

## 📋 Data Formats

### CSV Import Format
```csv
Timestamp,Value,Subgroup,Batch,Operator,Notes
2024-01-01 08:00:00,95.2,1,BATCH-001,John Smith,
2024-01-01 08:30:00,95.1,1,BATCH-001,John Smith,
```

### Excel Import Format
| Timestamp | Value | Subgroup | Batch | Operator | Notes |
|-----------|-------|----------|-------|----------|-------|
| 2024-01-01 08:00:00 | 95.2 | 1 | BATCH-001 | John Smith | |
| 2024-01-01 08:30:00 | 95.1 | 1 | BATCH-001 | John Smith | |

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📚 API Reference

### Process Data Structure
```typescript
interface ProcessData {
  id: string;
  name: string;
  description?: string;
  dataPoints: DataPoint[];
  subgroups: Subgroup[];
  specifications?: Specifications;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chart Configuration
```typescript
interface ChartConfig {
  id: string;
  type: ChartType;
  processId: string;
  title: string;
  sigmaLevel: number;
  showSpecifications: boolean;
  showTrendLine: boolean;
  showCapability: boolean;
  colors: ChartColors;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions
- **Email**: Contact support at [your-email@domain.com]

## 🙏 Acknowledgments

- **Chart.js**: For excellent charting capabilities
- **Tailwind CSS**: For beautiful, utility-first styling
- **React Team**: For the amazing React framework
- **SPC Community**: For statistical process control best practices

## 🔮 Roadmap

### Version 2.0
- [ ] Advanced analytics and machine learning
- [ ] Real-time data streaming
- [ ] Multi-user collaboration
- [ ] Advanced reporting templates
- [ ] Mobile app (React Native)

### Version 1.1
- [ ] Additional chart types (EWMA, CUSUM)
- [ ] Advanced control rules
- [ ] Data transformation tools
- [ ] Enhanced export options
- [ ] Performance optimizations

---

**SPaCial_AI** - Empowering quality professionals with modern statistical process control tools.