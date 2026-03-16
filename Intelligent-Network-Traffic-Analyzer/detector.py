import time
from collections import defaultdict
import database

# Thresholds for detection
PORT_SCAN_THRESHOLD = 20  # distinct ports within time window
PACKET_RATE_THRESHOLD = 1000  # packets per second from one IP
DNS_REQUEST_THRESHOLD = 50  # DNS requests within time window
TIME_WINDOW = 10  # in seconds

# In-memory structures for tracking
# src_ip -> set(dst_ports)
port_scans = defaultdict(set)
# src_ip -> list(timestamps)
packet_rates = defaultdict(list)
# src_ip -> list(timestamps)
dns_rates = defaultdict(list)

# Track when we last alerted to prevent spamming DB
last_alerted = defaultdict(float)
ALERT_COOLDOWN = 60  # seconds

def clean_old_records(ip, records, window):
    """Removes timestamps older than the time window."""
    current_time = time.time()
    return [ts for ts in records if current_time - ts <= window]

def detect_anomalies(src_ip, dst_port, protocol, packet_length):
    """Evaluates a single packet for anomalies and generates alerts."""
    current_time = time.time()
    
    # 1. Port Scanning Detection
    if dst_port:
        port_scans[src_ip].add(dst_port)
        if len(port_scans[src_ip]) > PORT_SCAN_THRESHOLD:
            if current_time - last_alerted[f"port_scan_{src_ip}"] > ALERT_COOLDOWN:
                database.insert_alert(
                    "Port Scan", 
                    src_ip, 
                f"Detected connections to over {PORT_SCAN_THRESHOLD} distinct ports."
                )
                last_alerted[f"port_scan_{src_ip}"] = current_time
            # Reset after alerting
            port_scans[src_ip] = set()

    # 2. High Packet Rate Detection (DDoS / Flood)
    packet_rates[src_ip].append(current_time)
    packet_rates[src_ip] = clean_old_records(src_ip, packet_rates[src_ip], TIME_WINDOW)
    
    # Packets per second estimation
    pps = len(packet_rates[src_ip]) / TIME_WINDOW
    if pps > PACKET_RATE_THRESHOLD:
        if current_time - last_alerted[f"flood_{src_ip}"] > ALERT_COOLDOWN:
            database.insert_alert(
                "High Traffic Volume",
                src_ip,
                f"Unusually high packet rate detected: ~{int(pps)} packets/sec."
            )
            last_alerted[f"flood_{src_ip}"] = current_time
            packet_rates[src_ip] = [] # Reset

    # 3. Repeated DNS Requests
    if protocol == "DNS":
        dns_rates[src_ip].append(current_time)
        dns_rates[src_ip] = clean_old_records(src_ip, dns_rates[src_ip], TIME_WINDOW)
        
        if len(dns_rates[src_ip]) > DNS_REQUEST_THRESHOLD:
            if current_time - last_alerted[f"dns_{src_ip}"] > ALERT_COOLDOWN:
                database.insert_alert(
                    "DNS Flood / Amplification Attempt",
                    src_ip,
                    f"Over {DNS_REQUEST_THRESHOLD} DNS requests within {TIME_WINDOW} seconds."
                )
                last_alerted[f"dns_{src_ip}"] = current_time
                dns_rates[src_ip] = [] # Reset

