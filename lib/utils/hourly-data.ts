// Generate hourly data for today with realistic distribution
export function generateHourlyData(
  totalRevenue: number = 0,
  totalSales: number = 0
) {
  const hours = [];
  const revenuePerHour = totalRevenue / 24;
  const salesPerHour = totalSales / 24;

  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, "0");
    // Add some variance to make it look more realistic
    const variance = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
    
    hours.push({
      hour: `${hour}:00`,
      revenue: Math.max(0, Math.floor(revenuePerHour * variance)),
      sales: Math.max(0, Math.floor(salesPerHour * variance)),
    });
  }

  return hours;
}
