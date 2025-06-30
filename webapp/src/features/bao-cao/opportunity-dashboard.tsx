import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const Dashboard = () => {
  // Color palette matching the design
  const colors = {
    teal: '#4DB6AC',
    darkGray: '#455A64',
    coral: '#FF7043',
    yellow: '#FFD54F',
    lightTeal: '#80CBC4',
    mediumGray: '#607D8B',
    darkTeal: '#00897B',
  };

  // Data for charts
  const partnerCenterData = [
    { name: 'No', small: 2, medium: 1, large: 3 },
    { name: 'Yes', small: 1, medium: 2, large: 4 },
  ];

  const salesStageData = [
    { name: 'No', lead: 1, qualify: 0, solution: 0, proposal: 0, timeline: 0 },
    { name: 'Yes', lead: 2, qualify: 1, solution: 1, proposal: 0, timeline: 0 },
  ];

  const regionData = [
    { name: 'East', value: 43 },
    { name: 'Central', value: 29 },
    { name: 'West', value: 28 },
  ];

  const monthlyData = [
    { month: 'Jan', lead: 20, qualify: 10, solution: 15, proposal: 20, timeline: 15 },
    { month: 'Feb', lead: 8, qualify: 5, solution: 10, proposal: 25, timeline: 22 },
    { month: 'Mar', lead: 5, qualify: 8, solution: 12, proposal: 30, timeline: 25 },
    { month: 'Apr', lead: 10, qualify: 15, solution: 8, proposal: 20, timeline: 27 },
    { month: 'May', lead: 5, qualify: 10, solution: 5, proposal: 15, timeline: 25 },
    { month: 'Jun', lead: 3, qualify: 8, solution: 10, proposal: 12, timeline: 30 },
    { month: 'Jul', lead: 2, qualify: 5, solution: 8, proposal: 10, timeline: 35 },
    { month: 'Aug', lead: 5, qualify: 10, solution: 15, proposal: 20, timeline: 40 },
    { month: 'Sep', lead: 0, qualify: 0, solution: 0, proposal: 0, timeline: 45 },
    { month: 'Oct', lead: 0, qualify: 0, solution: 0, proposal: 0, timeline: 48 },
    { month: 'Nov', lead: 0, qualify: 0, solution: 0, proposal: 0, timeline: 50 },
    { month: 'Dec', lead: 0, qualify: 0, solution: 0, proposal: 0, timeline: 55 },
  ];

  const regionOpportunityData = [
    { region: 'East', small: 70, medium: 10, large: 5 },
    { region: 'Central', small: 50, medium: 15, large: 10 },
    { region: 'West', small: 30, medium: 10, large: 5 },
  ];

  const revenueData = [
    { stage: 'Lead', no: 4, yes: 1.2 },
    { stage: 'Qualify', no: 0.8, yes: 1.5 },
    { stage: 'Solution', no: 0.6, yes: 1.2 },
    { stage: 'Proposal', no: 0.4, yes: 0.8 },
    { stage: 'Timeline', no: 0.2, yes: 0.3 },
  ];

  const avgRevenueData = [
    { name: 'Yes', small: 5, medium: 25, large: 85 },
    { name: 'No', small: 8, medium: 25, large: 55 },
  ];

  const styles = {
    container: {
      padding: '16px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '16px',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    },
    bigNumberCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
    },
    bigNumber: {
      fontSize: '96px',
      fontWeight: '300',
      color: colors.darkGray,
      margin: 0,
    },
    title: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '4px',
      fontWeight: '500',
    },
    subtitle: {
      fontSize: '11px',
      color: '#999',
      marginBottom: '16px',
      textTransform: 'uppercase',
    },
    legend: {
      display: 'flex',
      gap: '16px',
      marginTop: '12px',
      flexWrap: 'wrap',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    legendColor: {
      width: '10px',
      height: '10px',
      borderRadius: '2px',
    },
    legendText: {
      fontSize: '12px',
      color: '#666',
    },
    fullWidth: {
      gridColumn: 'span 2',
    },
  };

  const renderCustomizedLabel = entry => {
    return `${entry.value}%`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Large Number Display */}
        <div style={styles.bigNumberCard}>
          <h1 style={styles.bigNumber}>487</h1>
        </div>

        {/* Partner Center Bar Charts */}
        <div style={styles.card}>
          <h3 style={styles.title}>Opportunity Count</h3>
          <p style={styles.subtitle}>BY PARTNER CENTER, OPPORTUNITY SIZE</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={partnerCenterData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="small" fill={colors.teal} />
              <Bar dataKey="medium" fill={colors.darkGray} />
              <Bar dataKey="large" fill={colors.coral} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Small</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Medium</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Large</span>
            </div>
          </div>
        </div>

        {/* Sales Stage Bar Chart */}
        <div style={styles.card}>
          <h3 style={styles.title}>Opportunity Count</h3>
          <p style={styles.subtitle}>BY PARTNER CENTER, SALES STAGE</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={salesStageData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="lead" fill={colors.teal} />
              <Bar dataKey="qualify" fill={colors.darkGray} />
              <Bar dataKey="solution" fill={colors.yellow} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Lead</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Qualify</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.yellow }} />
              <span style={styles.legendText}>Solution</span>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={styles.card}>
          <h3 style={styles.title}>Opportunity Count</h3>
          <p style={styles.subtitle}>BY REGION</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={regionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill={colors.darkGray} />
                <Cell fill={colors.teal} />
                <Cell fill={colors.coral} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ ...styles.legend, justifyContent: 'center' }}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>East</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Central</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>West</span>
            </div>
          </div>
        </div>

        {/* Monthly Stacked Bar Chart */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Opportunity Count</h3>
          <p style={styles.subtitle}>BY MONTH, SALES STAGE</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Bar dataKey="lead" stackId="a" fill={colors.coral} />
              <Bar dataKey="qualify" stackId="a" fill={colors.yellow} />
              <Bar dataKey="solution" stackId="a" fill={colors.darkGray} />
              <Bar dataKey="proposal" stackId="a" fill={colors.mediumGray} />
              <Bar dataKey="timeline" stackId="a" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Lead</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.yellow }} />
              <span style={styles.legendText}>Qualify</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Solution</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.mediumGray }} />
              <span style={styles.legendText}>Proposal</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Timeline</span>
            </div>
          </div>
        </div>

        {/* Region Opportunity Size */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Opportunity Count</h3>
          <p style={styles.subtitle}>BY REGION, OPPORTUNITY SIZE</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionOpportunityData} layout="horizontal">
              <XAxis type="number" />
              <YAxis dataKey="region" type="category" />
              <Bar dataKey="large" stackId="a" fill={colors.coral} />
              <Bar dataKey="medium" stackId="a" fill={colors.darkGray} />
              <Bar dataKey="small" stackId="a" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Small</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Medium</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Large</span>
            </div>
          </div>
        </div>

        {/* Revenue by Sales Stage */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Revenue</h3>
          <p style={styles.subtitle}>BY SALES STAGE, PARTNER DRIVEN</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <XAxis dataKey="stage" />
              <YAxis />
              <Bar dataKey="no" fill={colors.darkGray} />
              <Bar dataKey="yes" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>No</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Yes</span>
            </div>
          </div>
        </div>

        {/* Average Revenue */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Average Revenue</h3>
          <p style={styles.subtitle}>BY PARTNER CENTER, OPPORTUNITY SIZE</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgRevenueData} layout="horizontal">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Bar dataKey="large" stackId="a" fill={colors.coral} />
              <Bar dataKey="medium" stackId="a" fill={colors.darkGray} />
              <Bar dataKey="small" stackId="a" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Small</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Medium</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Large</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
