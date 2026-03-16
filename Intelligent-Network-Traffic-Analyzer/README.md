# Intelligent Network Traffic Analyzer

A complete end-to-end network traffic sniffing and analysis project built with Python, Scapy, Flask, SQLite, and HTML/CSS/JS.
Perfect for detecting suspicious network activity and viewing real-time bandwidth usage.

## Features
1. **Live Packet Capture**: Captures packets from the network interface using `scapy` in real-time.
2. **Protocol Parsing**: Identifies protocols like TCP, UDP, HTTP, DNS, and ICMP.
3. **Data Tracking**: Tracks bandwidth per protocol and per source/destination IP.
4. **Suspicious Traffic Detection**: Uses heuristics to detect:
   - Port Scans
   - High Packet Rate Attacks / DDoS attempts
   - Unusual repeated DNS requests
   - Connections to an abnormal number of ports
5. **Database Logging**: Persists packet summaries and alerts using SQLite.
6. **Web Dashboard**: An intuitive and professional Flask dashboard displaying live constraints, top talkers, bandwidth charts, and suspicious alerts.
7. **Simulated Mode**: Automatically drops back to "Simulation Mode" if real sniffing is unavailable (due to permission constraints like lack of root/admin access).

## Project Structure
- `app.py`: The Flask web server serving the APIs and Dashboard.
- `sniffer.py`: The network traffic capture engine utilizing Scapy. Handles real-time traffic and simulation fallbacks.
- `database.py`: SQLite Database operations and setup.
- `detector.py`: Heuristics engine logic that generates alerts for suspicious traffic.
- `templates/` & `static/`: HTML UI, CSS styles, JS logic, and Chart.js integration.

## How to Run

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Application**
   Run the Flask server (run as Administrator / sudo if you want live packet sniffing capabilities):
   ```bash
   python app.py
   ```
   *Note: If you run it without Admin privileges, it will automatically run in Simulated Demo Mode.*

3. **Access the Dashboard**
   Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)
