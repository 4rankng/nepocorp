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

const BaoCaoTaiChinh = () => {
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
  const revenueByVehicleData = [
    { name: 'Xe tải', small: 25, medium: 15, large: 8 },
    { name: 'Container', small: 12, medium: 18, large: 22 },
  ];

  const costByTypeData = [
    { name: 'Nhiên liệu', fuel: 45, maintenance: 0, salary: 0, insurance: 0, other: 0 },
    { name: 'Bảo dưỡng', fuel: 0, maintenance: 25, salary: 0, insurance: 0, other: 0 },
    { name: 'Lương', fuel: 0, maintenance: 0, salary: 35, insurance: 0, other: 0 },
    { name: 'Bảo hiểm', fuel: 0, maintenance: 0, salary: 0, insurance: 15, other: 0 },
    { name: 'Khác', fuel: 0, maintenance: 0, salary: 0, insurance: 0, other: 20 },
  ];

  const regionData = [
    { name: 'Miền Bắc', value: 42 },
    { name: 'Miền Trung', value: 28 },
    { name: 'Miền Nam', value: 30 },
  ];

  const monthlyData = [
    { month: 'T1', revenue: 85, cost: 65, profit: 20, maintenance: 12, fuel: 25 },
    { month: 'T2', revenue: 92, cost: 70, profit: 22, maintenance: 15, fuel: 28 },
    { month: 'T3', revenue: 88, cost: 68, profit: 20, maintenance: 18, fuel: 30 },
    { month: 'T4', revenue: 95, cost: 72, profit: 23, maintenance: 14, fuel: 32 },
    { month: 'T5', revenue: 90, cost: 69, profit: 21, maintenance: 16, fuel: 29 },
    { month: 'T6', revenue: 98, cost: 75, profit: 23, maintenance: 20, fuel: 35 },
    { month: 'T7', revenue: 102, cost: 78, profit: 24, maintenance: 22, fuel: 38 },
    { month: 'T8', revenue: 105, cost: 80, profit: 25, maintenance: 25, fuel: 40 },
    { month: 'T9', revenue: 100, cost: 76, profit: 24, maintenance: 18, fuel: 42 },
    { month: 'T10', revenue: 108, cost: 82, profit: 26, maintenance: 20, fuel: 45 },
    { month: 'T11', revenue: 112, cost: 85, profit: 27, maintenance: 22, fuel: 48 },
    { month: 'T12', revenue: 115, cost: 88, profit: 27, maintenance: 25, fuel: 50 },
  ];

  const routeProfitData = [
    { route: 'HN-HCM', small: 120, medium: 85, large: 95 },
    { route: 'HN-DN', small: 80, medium: 60, large: 70 },
    { route: 'HCM-CN', small: 65, medium: 45, large: 55 },
  ];

  const customerRevenueData = [
    { stage: 'VIP', current: 180, new: 120 },
    { stage: 'Thường xuyên', current: 140, new: 95 },
    { stage: 'Mới', current: 85, new: 110 },
    { stage: 'Tiềm năng', current: 60, new: 85 },
    { stage: 'Khác', current: 45, new: 55 },
  ];

  const avgRevenueData = [
    { name: 'Q1', small: 85, medium: 125, large: 185 },
    { name: 'Q2', small: 92, medium: 135, large: 195 },
    { name: 'Q3', small: 88, medium: 140, large: 200 },
    { name: 'Q4', small: 95, medium: 150, large: 210 },
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
          <h1 style={styles.bigNumber}>32.5</h1>
        </div>

        {/* Revenue by Vehicle Type */}
        <div style={styles.card}>
          <h3 style={styles.title}>Doanh thu theo Loại xe</h3>
          <p style={styles.subtitle}>PHÂN LOẠI THEO TẢI TRỌNG</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={revenueByVehicleData}>
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
              <span style={styles.legendText}>Nhỏ (&lt; 5T)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Trung (5-15T)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Lớn (&gt; 15T)</span>
            </div>
          </div>
        </div>

        {/* Cost by Type */}
        <div style={styles.card}>
          <h3 style={styles.title}>Chi phí theo Loại</h3>
          <p style={styles.subtitle}>PHÂN BỔ CHI PHÍ HOẠT ĐỘNG</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={costByTypeData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="fuel" fill={colors.teal} />
              <Bar dataKey="maintenance" fill={colors.darkGray} />
              <Bar dataKey="salary" fill={colors.yellow} />
              <Bar dataKey="insurance" fill={colors.coral} />
              <Bar dataKey="other" fill={colors.mediumGray} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Nhiên liệu</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Bảo dưỡng</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.yellow }} />
              <span style={styles.legendText}>Lương</span>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={styles.card}>
          <h3 style={styles.title}>Doanh thu theo Khu vực</h3>
          <p style={styles.subtitle}>PHÂN BỔ THEO MIỀN</p>
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
              <span style={styles.legendText}>Miền Bắc</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Miền Trung</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Miền Nam</span>
            </div>
          </div>
        </div>

        {/* Monthly Stacked Bar Chart */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Báo cáo Tài chính theo Tháng</h3>
          <p style={styles.subtitle}>DOANH THU, CHI PHÍ, LỢI NHUẬN (TỶ VND)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Bar dataKey="revenue" stackId="a" fill={colors.teal} />
              <Bar dataKey="cost" stackId="a" fill={colors.coral} />
              <Bar dataKey="profit" stackId="a" fill={colors.yellow} />
              <Bar dataKey="maintenance" stackId="b" fill={colors.darkGray} />
              <Bar dataKey="fuel" stackId="b" fill={colors.mediumGray} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Doanh thu</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Chi phí</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.yellow }} />
              <span style={styles.legendText}>Lợi nhuận</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Bảo dưỡng</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.mediumGray }} />
              <span style={styles.legendText}>Nhiên liệu</span>
            </div>
          </div>
        </div>

        {/* Route Profit */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Lợi nhuận theo Tuyến đường</h3>
          <p style={styles.subtitle}>PHÂN LOẠI THEO TẢI TRỌNG XE</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={routeProfitData} layout="horizontal">
              <XAxis type="number" />
              <YAxis dataKey="route" type="category" />
              <Bar dataKey="large" stackId="a" fill={colors.coral} />
              <Bar dataKey="medium" stackId="a" fill={colors.darkGray} />
              <Bar dataKey="small" stackId="a" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Xe nhỏ</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Xe trung</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Xe lớn</span>
            </div>
          </div>
        </div>

        {/* Customer Revenue */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Doanh thu theo Khách hàng</h3>
          <p style={styles.subtitle}>PHÂN LOẠI THEO NHÓM KHÁCH HÀNG</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={customerRevenueData}>
              <XAxis dataKey="stage" />
              <YAxis />
              <Bar dataKey="current" fill={colors.darkGray} />
              <Bar dataKey="new" fill={colors.teal} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Hiện tại</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.teal }} />
              <span style={styles.legendText}>Mới</span>
            </div>
          </div>
        </div>

        {/* Average Revenue */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.title}>Doanh thu Trung bình</h3>
          <p style={styles.subtitle}>THEO QUÝ, PHÂN LOẠI TẢI TRỌNG</p>
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
              <span style={styles.legendText}>Xe nhỏ</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.darkGray }} />
              <span style={styles.legendText}>Xe trung</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: colors.coral }} />
              <span style={styles.legendText}>Xe lớn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaoCaoTaiChinh;
