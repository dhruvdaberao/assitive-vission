from flask import Flask, render_template, jsonify
import threading
import database
import sniffer

app = Flask(__name__)

@app.route('/')
def index():
    """Renders the main dashboard."""
    return render_template('index.html')

@app.route('/api/stats')
def api_stats():
    """Returns basic aggregate statistics."""
    packet_count = database.execute_query("SELECT COUNT(*) as count FROM packets")[0]['count']
    alert_count = database.execute_query("SELECT COUNT(*) as count FROM alerts")[0]['count']
    return jsonify({
        'total_packets': packet_count,
        'total_alerts': alert_count
    })

@app.route('/api/protocols')
def api_protocols():
    """Returns protocol distribution."""
    rows = database.execute_query('''
        SELECT protocol, COUNT(*) as count 
        FROM packets 
        GROUP BY protocol
    ''')
    data = {row['protocol']: row['count'] for row in rows}
    return jsonify(data)

@app.route('/api/top_ips')
def api_top_ips():
    """Returns top talkers by packet count."""
    rows = database.execute_query('''
        SELECT src_ip, COUNT(*) as count 
        FROM packets 
        GROUP BY src_ip 
        ORDER BY count DESC 
        LIMIT 5
    ''')
    data = [{'ip': row['src_ip'], 'count': row['count']} for row in rows]
    return jsonify(data)

@app.route('/api/alerts')
def api_alerts():
    """Returns the 10 most recent alerts."""
    rows = database.execute_query('''
        SELECT timestamp, alert_type, src_ip, description 
        FROM alerts 
        ORDER BY timestamp DESC 
        LIMIT 10
    ''')
    return jsonify(rows)

@app.route('/api/recent_traffic')
def api_recent_traffic():
    """Returns volume of traffic per minute for timeline chart."""
    # Group by minute
    rows = database.execute_query('''
        SELECT strftime('%H:%M', timestamp) as minute, COUNT(*) as count
        FROM packets
        GROUP BY minute
        ORDER BY minute DESC
        LIMIT 15
    ''')
    # Reverse to show chronological order
    data = [{'time': row['minute'], 'count': row['count']} for row in reversed(rows)]
    return jsonify(data)

if __name__ == '__main__':
    # Initialize the database logic
    database.init_db()
    
    # Start the packet sniffing engine in a separate thread
    print("Starting packet sniffing engine...")
    capture_thread = sniffer.start_capture_thread()
    
    # Start the Flask development server
    try:
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("Shutting down...")
        sniffer.running = False
        capture_thread.join(timeout=2)
