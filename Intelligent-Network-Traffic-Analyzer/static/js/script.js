// Configure Chart.js styling
Chart.defaults.font.family = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.color = '#858796';

let trafficLineChart;
let protocolPieChart;

// Initialize Charts
function initCharts() {
    // 1. Line Chart (Traffic Volume)
    const ctxLine = document.getElementById("trafficLineChart");
    trafficLineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: "Packets / min",
                lineTension: 0.3,
                backgroundColor: "rgba(78, 115, 223, 0.05)",
                borderColor: "rgba(78, 115, 223, 1)",
                pointRadius: 3,
                pointBackgroundColor: "rgba(78, 115, 223, 1)",
                pointBorderColor: "rgba(78, 115, 223, 1)",
                pointHoverRadius: 3,
                pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
                pointHoverBorderColor: "rgba(78, 115, 223, 1)",
                pointHitRadius: 10,
                pointBorderWidth: 2,
                data: [],
                fill: true
            }],
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: { grid: { display: false, drawBorder: false } },
                y: { 
                    beginAtZero: true, 
                    grid: { color: "rgb(234, 236, 244)", zeroLineColor: "rgb(234, 236, 244)", drawBorder: false, borderDash: [2], zeroLineBorderDash: [2] }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 2. Pie Chart (Protocols)
    const ctxPie = document.getElementById("protocolPieChart");
    protocolPieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'],
                hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf', '#f4b619', '#e02d1b', '#6e707e'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Fetch Data & Update UI
async function fetchUpdate() {
    try {
        // Fetch basic stats
        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();
        document.getElementById('totalPackets').innerText = stats.total_packets.toLocaleString();
        document.getElementById('totalAlerts').innerText = stats.total_alerts.toLocaleString();

        // Fetch Top IPs
        const ipsRes = await fetch('/api/top_ips');
        const ips = await ipsRes.json();
        const topIpsList = document.getElementById('topIpsList');
        topIpsList.innerHTML = '';
        if (ips.length === 0) {
            topIpsList.innerHTML = '<li class="list-group-item text-muted text-center">No traffic yet</li>';
        } else {
            ips.forEach(ipData => {
                topIpsList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${ipData.ip}
                        <span class="badge bg-primary rounded-pill badge-custom">${ipData.count.toLocaleString()}</span>
                    </li>
                `;
            });
        }

        // Fetch Alerts
        const alertsRes = await fetch('/api/alerts');
        const alerts = await alertsRes.json();
        const alertsTable = document.getElementById('alertsTableBody');
        alertsTable.innerHTML = '';
        if (alerts.length === 0) {
            alertsTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No alerts detected... yet.</td></tr>';
        } else {
            alerts.forEach(alert => {
                const badgeColor = alert.alert_type.includes('DDoS') || alert.alert_type.includes('High') ? 'bg-danger' : 
                                   alert.alert_type.includes('Scan') ? 'bg-warning text-dark' : 'bg-info text-dark';
                
                alertsTable.innerHTML += `
                    <tr>
                        <td class="text-nowrap">${alert.timestamp}</td>
                        <td><span class="badge ${badgeColor}">${alert.alert_type}</span></td>
                        <td class="font-monospace text-danger fw-bold">${alert.src_ip}</td>
                        <td>${alert.description}</td>
                    </tr>
                `;
            });
        }

        // Fetch Protocol Chart Data
        const protoRes = await fetch('/api/protocols');
        const protocols = await protoRes.json();
        protocolPieChart.data.labels = Object.keys(protocols);
        protocolPieChart.data.datasets[0].data = Object.values(protocols);
        protocolPieChart.update();

        // Fetch Traffic Volume Timeline API logic (Not strictly implemented in app.py directly for time series but let's assume it returns {time: , count: })
        const timelineRes = await fetch('/api/recent_traffic');
        if (timelineRes.ok) {
            const timeline = await timelineRes.json();
            trafficLineChart.data.labels = timeline.map(t => t.time);
            trafficLineChart.data.datasets[0].data = timeline.map(t => t.count);
            trafficLineChart.update();
        }

    } catch (e) {
        console.error("Error fetching updates:", e);
    }
}

// Startup
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchUpdate(); // Initial fetch
    setInterval(fetchUpdate, 3000); // Poll every 3 seconds
});
